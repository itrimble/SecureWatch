"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SystemService {
    async getSystemResources() {
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
        }
        catch (error) {
            // Return default values if system monitoring fails
            return {
                cpu: { percentage: 0, loadAverage: [0, 0, 0] },
                memory: { totalMB: 0, usedMB: 0, freeMB: 0, percentage: 0 },
                disk: { totalGB: 0, usedGB: 0, freeGB: 0, percentage: 0 }
            };
        }
    }
    async getCpuUsage() {
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
        }
        catch (error) {
            return {
                percentage: 0,
                loadAverage
            };
        }
    }
    getMemoryInfo() {
        const totalBytes = os.totalmem();
        const freeBytes = os.freemem();
        const usedBytes = totalBytes - freeBytes;
        const totalMB = Math.round(totalBytes / 1024 / 1024);
        const usedMB = Math.round(usedBytes / 1024 / 1024);
        const freeMB = Math.round(freeBytes / 1024 / 1024);
        const percentage = Math.round((usedBytes / totalBytes) * 100);
        return { totalMB, usedMB, freeMB, percentage };
    }
    async getDiskUsage() {
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
        }
        catch (error) {
            // Fallback values
        }
        return { totalGB: 0, usedGB: 0, freeGB: 0, percentage: 0 };
    }
    parseSize(sizeStr) {
        const num = parseFloat(sizeStr);
        if (sizeStr.includes('T'))
            return num * 1024;
        if (sizeStr.includes('G'))
            return num;
        if (sizeStr.includes('M'))
            return num / 1024;
        if (sizeStr.includes('K'))
            return num / 1024 / 1024;
        return num / 1024 / 1024 / 1024; // bytes to GB
    }
    async getDockerServices(composeFile) {
        try {
            const { stdout } = await execAsync(`docker compose -f ${composeFile} ps --format json`);
            const services = JSON.parse(`[${stdout.split('\n').filter(line => line.trim()).join(',')}]`);
            return services.map((service) => ({
                name: service.Service || service.Name,
                status: service.State || service.Status,
                ports: service.Publishers?.map((p) => `${p.PublishedPort}:${p.TargetPort}`).join(', ') || '',
                health: service.Health
            }));
        }
        catch (error) {
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
            }
            catch (fallbackError) {
                return [];
            }
        }
    }
    async getRecentLogs(logPath, lines = 10) {
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
                    level: levelMatch?.[1]?.toLowerCase() || 'info',
                    service: this.extractServiceFromPath(logPath),
                    message: line
                };
            });
        }
        catch (error) {
            return [];
        }
    }
    extractServiceFromPath(logPath) {
        const filename = logPath.split('/').pop() || '';
        return filename.replace('.log', '');
    }
    async checkProcessByPort(port) {
        try {
            const { stdout } = await execAsync(`lsof -i :${port}`);
            return stdout.trim().length > 0;
        }
        catch (error) {
            return false;
        }
    }
    async getProcessInfo(port) {
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
                }
                catch {
                    return { pid };
                }
            }
        }
        catch (error) {
            return null;
        }
        return null;
    }
}
exports.SystemService = SystemService;
//# sourceMappingURL=system.service.js.map