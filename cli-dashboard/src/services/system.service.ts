import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { SystemResourceUsage, DockerServiceStatus, LogEntry } from '../types';
import * as fs from 'fs';

const execAsync = promisify(exec);

export class SystemService {
  async getSystemResources(): Promise<SystemResourceUsage> {
    try {
      const [cpuUsage, memoryInfo, diskUsage] = await Promise.all([
        this.getCpuUsage(),
        this.getMemoryInfo(),
        this.getDiskUsage()
      ]);

      return {
        cpu: cpuUsage,
        memory: memoryInfo,
        disk: diskUsage
      };
    } catch (error) {
      // Return default values if system monitoring fails
      return {
        cpu: { percentage: 0, loadAverage: [0, 0, 0] },
        memory: { totalMB: 0, usedMB: 0, freeMB: 0, percentage: 0 },
        disk: { totalGB: 0, usedGB: 0, freeGB: 0, percentage: 0 }
      };
    }
  }

  private async getCpuUsage(): Promise<{ percentage: number; loadAverage: number[] }> {
    const loadAverage = os.loadavg();
    
    try {
      // Get CPU usage on macOS/Linux
      const { stdout } = await execAsync("top -l 1 -n 0 | grep 'CPU usage' || iostat 1 1 | tail -1");
      
      // Parse CPU usage from top output (macOS format)
      const cpuMatch = stdout.match(/(\d+\.\d+)%\s*user/);
      const percentage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
      
      return {
        percentage,
        loadAverage
      };
    } catch (error) {
      return {
        percentage: 0,
        loadAverage
      };
    }
  }

  private getMemoryInfo(): { totalMB: number; usedMB: number; freeMB: number; percentage: number } {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    
    const totalMB = Math.round(totalBytes / 1024 / 1024);
    const usedMB = Math.round(usedBytes / 1024 / 1024);
    const freeMB = Math.round(freeBytes / 1024 / 1024);
    const percentage = Math.round((usedBytes / totalBytes) * 100);
    
    return { totalMB, usedMB, freeMB, percentage };
  }

  private async getDiskUsage(): Promise<{ totalGB: number; usedGB: number; freeGB: number; percentage: number }> {
    try {
      const { stdout } = await execAsync("df -h / | tail -1");
      const parts = stdout.split(/\s+/);
      
      // Parse df output (format: filesystem, size, used, available, use%, mount)
      if (parts.length >= 5) {
        const total = this.parseSize(parts[1]);
        const used = this.parseSize(parts[2]);
        const available = this.parseSize(parts[3]);
        const percentage = parseInt(parts[4].replace('%', '')) || 0;
        
        return {
          totalGB: Math.round(total),
          usedGB: Math.round(used),
          freeGB: Math.round(available),
          percentage
        };
      }
    } catch (error) {
      // Fallback values
    }
    
    return { totalGB: 0, usedGB: 0, freeGB: 0, percentage: 0 };
  }

  private parseSize(sizeStr: string): number {
    const num = parseFloat(sizeStr);
    if (sizeStr.includes('T')) return num * 1024;
    if (sizeStr.includes('G')) return num;
    if (sizeStr.includes('M')) return num / 1024;
    if (sizeStr.includes('K')) return num / 1024 / 1024;
    return num / 1024 / 1024 / 1024; // bytes to GB
  }

  async getDockerServices(composeFile: string): Promise<DockerServiceStatus[]> {
    try {
      const { stdout } = await execAsync(`docker compose -f ${composeFile} ps --format json`);
      const services = JSON.parse(`[${stdout.split('\n').filter(line => line.trim()).join(',')}]`);
      
      return services.map((service: any) => ({
        name: service.Service || service.Name,
        status: service.State || service.Status,
        ports: service.Publishers?.map((p: any) => `${p.PublishedPort}:${p.TargetPort}`).join(', ') || '',
        health: service.Health
      }));
    } catch (error) {
      // Try alternative docker command
      try {
        const { stdout } = await execAsync(`docker compose -f ${composeFile} ps`);
        const lines = stdout.split('\n').slice(1).filter(line => line.trim());
        
        return lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[0] || 'unknown',
            status: parts[1] || 'unknown',
            ports: parts[2] || '',
            health: undefined
          };
        });
      } catch (fallbackError) {
        return [];
      }
    }
  }

  async getRecentLogs(logPath: string, lines: number = 10): Promise<LogEntry[]> {
    try {
      if (!fs.existsSync(logPath)) {
        return [];
      }

      const { stdout } = await execAsync(`tail -n ${lines} "${logPath}"`);
      const logLines = stdout.split('\n').filter(line => line.trim());
      
      return logLines.map(line => {
        // Parse log line (basic format detection)
        const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        const levelMatch = line.match(/(ERROR|WARN|INFO|DEBUG)/i);
        
        return {
          timestamp: timestampMatch ? new Date(timestampMatch[1]) : new Date(),
          level: (levelMatch?.[1]?.toLowerCase() as any) || 'info',
          service: this.extractServiceFromPath(logPath),
          message: line
        };
      });
    } catch (error) {
      return [];
    }
  }

  private extractServiceFromPath(logPath: string): string {
    const filename = logPath.split('/').pop() || '';
    return filename.replace('.log', '');
  }

  async checkProcessByPort(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  async getProcessInfo(port: number): Promise<{ pid?: number; command?: string } | null> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pid = parseInt(stdout.trim());
      
      if (pid) {
        try {
          const { stdout: cmdStdout } = await execAsync(`ps -p ${pid} -o comm=`);
          return {
            pid,
            command: cmdStdout.trim()
          };
        } catch {
          return { pid };
        }
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }
}