"""
SecureWatch Agent Management Console
Web-based interface for managing and monitoring SecureWatch agents
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import uuid

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_socketio import SocketIO, emit
import aiohttp
import ssl
import sqlite3
from dataclasses import dataclass, asdict

from ..core.config import AgentConfig, ConfigManager
from ..core.exceptions import AgentError


@dataclass
class AgentInfo:
    """Information about a managed agent"""
    agent_id: str
    hostname: str
    ip_address: str
    status: str  # online, offline, error, unknown
    last_seen: datetime
    version: str
    config_path: str
    collectors_enabled: List[str]
    events_per_minute: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    health_score: float
    uptime: int  # seconds
    errors_count: int


class AgentDatabase:
    """SQLite database for storing agent information"""
    
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self) -> None:
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agents (
                    agent_id TEXT PRIMARY KEY,
                    hostname TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'unknown',
                    last_seen TIMESTAMP NOT NULL,
                    version TEXT NOT NULL,
                    config_path TEXT,
                    collectors_enabled TEXT,  -- JSON array
                    events_per_minute INTEGER DEFAULT 0,
                    cpu_usage REAL DEFAULT 0.0,
                    memory_usage REAL DEFAULT 0.0,
                    disk_usage REAL DEFAULT 0.0,
                    health_score REAL DEFAULT 0.0,
                    uptime INTEGER DEFAULT 0,
                    errors_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    cpu_usage REAL,
                    memory_usage REAL,
                    disk_usage REAL,
                    events_per_minute INTEGER,
                    health_score REAL,
                    FOREIGN KEY (agent_id) REFERENCES agents (agent_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    event_type TEXT NOT NULL,  -- status_change, error, config_update, etc.
                    message TEXT,
                    details TEXT,  -- JSON
                    FOREIGN KEY (agent_id) REFERENCES agents (agent_id)
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp 
                ON agent_metrics (agent_id, timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp 
                ON agent_events (agent_id, timestamp)
            """)
    
    def upsert_agent(self, agent: AgentInfo) -> None:
        """Insert or update agent information"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO agents (
                    agent_id, hostname, ip_address, status, last_seen, version,
                    config_path, collectors_enabled, events_per_minute,
                    cpu_usage, memory_usage, disk_usage, health_score,
                    uptime, errors_count, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent.agent_id, agent.hostname, agent.ip_address, agent.status,
                agent.last_seen, agent.version, agent.config_path,
                json.dumps(agent.collectors_enabled), agent.events_per_minute,
                agent.cpu_usage, agent.memory_usage, agent.disk_usage,
                agent.health_score, agent.uptime, agent.errors_count,
                datetime.now()
            ))
    
    def get_all_agents(self) -> List[AgentInfo]:
        """Get all registered agents"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM agents ORDER BY last_seen DESC
            """)
            
            agents = []
            for row in cursor.fetchall():
                agent = AgentInfo(
                    agent_id=row['agent_id'],
                    hostname=row['hostname'],
                    ip_address=row['ip_address'],
                    status=row['status'],
                    last_seen=datetime.fromisoformat(row['last_seen']),
                    version=row['version'],
                    config_path=row['config_path'],
                    collectors_enabled=json.loads(row['collectors_enabled'] or '[]'),
                    events_per_minute=row['events_per_minute'],
                    cpu_usage=row['cpu_usage'],
                    memory_usage=row['memory_usage'],
                    disk_usage=row['disk_usage'],
                    health_score=row['health_score'],
                    uptime=row['uptime'],
                    errors_count=row['errors_count']
                )
                agents.append(agent)
            
            return agents
    
    def get_agent(self, agent_id: str) -> Optional[AgentInfo]:
        """Get specific agent by ID"""
        agents = self.get_all_agents()
        return next((a for a in agents if a.agent_id == agent_id), None)
    
    def add_metric(self, agent_id: str, metrics: Dict[str, Any]) -> None:
        """Add metrics entry for agent"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO agent_metrics (
                    agent_id, timestamp, cpu_usage, memory_usage, 
                    disk_usage, events_per_minute, health_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, datetime.now(),
                metrics.get('cpu_usage', 0),
                metrics.get('memory_usage', 0),
                metrics.get('disk_usage', 0),
                metrics.get('events_per_minute', 0),
                metrics.get('health_score', 0)
            ))
    
    def get_agent_metrics(self, agent_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent metrics for an agent"""
        since = datetime.now() - timedelta(hours=hours)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM agent_metrics 
                WHERE agent_id = ? AND timestamp > ?
                ORDER BY timestamp
            """, (agent_id, since))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def add_event(self, agent_id: str, event_type: str, message: str, 
                  details: Optional[Dict[str, Any]] = None) -> None:
        """Add event entry for agent"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO agent_events (agent_id, timestamp, event_type, message, details)
                VALUES (?, ?, ?, ?, ?)
            """, (
                agent_id, datetime.now(), event_type, message,
                json.dumps(details) if details else None
            ))
    
    def get_agent_events(self, agent_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent events for an agent"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM agent_events 
                WHERE agent_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (agent_id, limit))
            
            return [dict(row) for row in cursor.fetchall()]


class AgentManager:
    """Manages communication with SecureWatch agents"""
    
    def __init__(self, database: AgentDatabase):
        self.database = database
        self.logger = logging.getLogger(__name__)
        self.ssl_context = self._create_ssl_context()
        self._discovery_task = None
        self._monitoring_task = None
        self.running = False
    
    def _create_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context for agent communication"""
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE  # For development
        return context
    
    async def start(self) -> None:
        """Start agent management tasks"""
        self.running = True
        self._discovery_task = asyncio.create_task(self._discovery_loop())
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.logger.info("Agent manager started")
    
    async def stop(self) -> None:
        """Stop agent management tasks"""
        self.running = False
        
        if self._discovery_task:
            self._discovery_task.cancel()
        if self._monitoring_task:
            self._monitoring_task.cancel()
        
        self.logger.info("Agent manager stopped")
    
    async def _discovery_loop(self) -> None:
        """Periodically discover and register new agents"""
        while self.running:
            try:
                await self._discover_agents()
                await asyncio.sleep(60)  # Discovery every minute
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Discovery loop error: {e}")
                await asyncio.sleep(10)
    
    async def _monitoring_loop(self) -> None:
        """Periodically monitor agent health and status"""
        while self.running:
            try:
                await self._monitor_agents()
                await asyncio.sleep(30)  # Monitor every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(10)
    
    async def _discover_agents(self) -> None:
        """Discover agents through various methods"""
        # In a real implementation, this would:
        # 1. Scan network for agents
        # 2. Check configuration for known agent endpoints
        # 3. Accept agent registrations
        
        # For now, create mock agents for demonstration
        await self._create_mock_agents()
    
    async def _create_mock_agents(self) -> None:
        """Create mock agents for demonstration"""
        mock_agents = [
            {
                'agent_id': 'agent-web01-001',
                'hostname': 'web01.company.com',
                'ip_address': '10.0.1.100',
                'version': '1.0.0',
                'collectors': ['windows_event', 'file'],
                'status': 'online'
            },
            {
                'agent_id': 'agent-db01-002',
                'hostname': 'db01.company.com', 
                'ip_address': '10.0.1.200',
                'version': '1.0.0',
                'collectors': ['syslog', 'file'],
                'status': 'online'
            },
            {
                'agent_id': 'agent-app01-003',
                'hostname': 'app01.company.com',
                'ip_address': '10.0.1.150',
                'version': '1.0.0',
                'collectors': ['file', 'windows_event'],
                'status': 'error'
            }
        ]
        
        for mock_agent in mock_agents:
            agent = AgentInfo(
                agent_id=mock_agent['agent_id'],
                hostname=mock_agent['hostname'],
                ip_address=mock_agent['ip_address'],
                status=mock_agent['status'],
                last_seen=datetime.now() - timedelta(seconds=30),
                version=mock_agent['version'],
                config_path=f"/etc/securewatch/{mock_agent['agent_id']}.json",
                collectors_enabled=mock_agent['collectors'],
                events_per_minute=150 + (hash(mock_agent['agent_id']) % 500),
                cpu_usage=20 + (hash(mock_agent['agent_id']) % 30),
                memory_usage=40 + (hash(mock_agent['agent_id']) % 20),
                disk_usage=60 + (hash(mock_agent['agent_id']) % 20),
                health_score=85 + (hash(mock_agent['agent_id']) % 15),
                uptime=86400 + (hash(mock_agent['agent_id']) % 604800),
                errors_count=hash(mock_agent['agent_id']) % 5
            )
            
            self.database.upsert_agent(agent)
            
            # Add some metrics
            metrics = {
                'cpu_usage': agent.cpu_usage,
                'memory_usage': agent.memory_usage,
                'disk_usage': agent.disk_usage,
                'events_per_minute': agent.events_per_minute,
                'health_score': agent.health_score
            }
            self.database.add_metric(agent.agent_id, metrics)
    
    async def _monitor_agents(self) -> None:
        """Monitor health of all registered agents"""
        agents = self.database.get_all_agents()
        
        for agent in agents:
            try:
                # In real implementation, would make HTTP/WebSocket calls to agent
                status = await self._check_agent_status(agent)
                
                # Update agent status
                if status != agent.status:
                    agent.status = status
                    agent.last_seen = datetime.now()
                    self.database.upsert_agent(agent)
                    
                    # Log status change event
                    self.database.add_event(
                        agent.agent_id, 'status_change',
                        f"Agent status changed to {status}",
                        {'old_status': agent.status, 'new_status': status}
                    )
                
                # Update metrics
                metrics = await self._get_agent_metrics(agent)
                if metrics:
                    self.database.add_metric(agent.agent_id, metrics)
                
            except Exception as e:
                self.logger.error(f"Failed to monitor agent {agent.agent_id}: {e}")
    
    async def _check_agent_status(self, agent: AgentInfo) -> str:
        """Check if agent is online and responding"""
        try:
            # Mock status check - in real implementation would ping agent
            time_since_seen = datetime.now() - agent.last_seen
            
            if time_since_seen.total_seconds() > 300:  # 5 minutes
                return 'offline'
            elif agent.errors_count > 10:
                return 'error'
            else:
                return 'online'
                
        except Exception:
            return 'unknown'
    
    async def _get_agent_metrics(self, agent: AgentInfo) -> Dict[str, Any]:
        """Get current metrics from agent"""
        # Mock metrics - in real implementation would query agent
        import random
        
        return {
            'cpu_usage': max(0, agent.cpu_usage + random.randint(-5, 5)),
            'memory_usage': max(0, agent.memory_usage + random.randint(-3, 3)),
            'disk_usage': max(0, agent.disk_usage + random.randint(-1, 1)),
            'events_per_minute': max(0, agent.events_per_minute + random.randint(-20, 50)),
            'health_score': max(0, min(100, agent.health_score + random.randint(-2, 2)))
        }
    
    async def send_command(self, agent_id: str, command: str, 
                          params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send command to specific agent"""
        try:
            # Mock command execution
            self.database.add_event(
                agent_id, 'command_sent',
                f"Command '{command}' sent to agent",
                {'command': command, 'params': params}
            )
            
            # Simulate command result
            return {
                'success': True,
                'message': f"Command '{command}' executed successfully",
                'result': {'status': 'completed', 'output': 'Mock output'}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def update_agent_config(self, agent_id: str, 
                                 config: Dict[str, Any]) -> Dict[str, Any]:
        """Update agent configuration"""
        try:
            # Mock config update
            self.database.add_event(
                agent_id, 'config_update',
                "Agent configuration updated",
                {'config_changes': list(config.keys())}
            )
            
            return {
                'success': True,
                'message': 'Configuration updated successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class ManagementConsole:
    """Web-based management console for SecureWatch agents"""
    
    def __init__(self, config_dir: str = "./console_config", 
                 db_path: str = "./console.db"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database and manager
        self.database = AgentDatabase(db_path)
        self.agent_manager = AgentManager(self.database)
        
        # Initialize Flask app
        self.app = Flask(__name__, 
                        template_folder=str(Path(__file__).parent / 'templates'),
                        static_folder=str(Path(__file__).parent / 'static'))
        self.app.secret_key = str(uuid.uuid4())
        
        # Initialize SocketIO for real-time updates
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        
        # Setup routes
        self._setup_routes()
        self._setup_socketio()
        
        self.logger = logging.getLogger(__name__)
    
    def _setup_routes(self) -> None:
        """Setup Flask routes"""
        
        @self.app.route('/')
        def index():
            """Main dashboard"""
            agents = self.database.get_all_agents()
            
            # Calculate summary statistics
            total_agents = len(agents)
            online_agents = len([a for a in agents if a.status == 'online'])
            offline_agents = len([a for a in agents if a.status == 'offline'])
            error_agents = len([a for a in agents if a.status == 'error'])
            
            total_events = sum(a.events_per_minute for a in agents)
            avg_health = sum(a.health_score for a in agents) / max(1, total_agents)
            
            stats = {
                'total_agents': total_agents,
                'online_agents': online_agents,
                'offline_agents': offline_agents,
                'error_agents': error_agents,
                'total_events_per_minute': total_events,
                'average_health_score': round(avg_health, 1)
            }
            
            return render_template('dashboard.html', agents=agents, stats=stats)
        
        @self.app.route('/agents')
        def agents_list():
            """Agents list page"""
            agents = self.database.get_all_agents()
            return render_template('agents.html', agents=agents)
        
        @self.app.route('/agent/<agent_id>')
        def agent_detail(agent_id):
            """Agent detail page"""
            agent = self.database.get_agent(agent_id)
            if not agent:
                flash(f'Agent {agent_id} not found', 'error')
                return redirect(url_for('agents_list'))
            
            # Get recent metrics and events
            metrics = self.database.get_agent_metrics(agent_id, hours=24)
            events = self.database.get_agent_events(agent_id, limit=50)
            
            return render_template('agent_detail.html', 
                                 agent=agent, metrics=metrics, events=events)
        
        @self.app.route('/api/agents')
        def api_agents():
            """API endpoint for agents data"""
            agents = self.database.get_all_agents()
            return jsonify([asdict(agent) for agent in agents])
        
        @self.app.route('/api/agent/<agent_id>/metrics')
        def api_agent_metrics(agent_id):
            """API endpoint for agent metrics"""
            hours = request.args.get('hours', 24, type=int)
            metrics = self.database.get_agent_metrics(agent_id, hours)
            return jsonify(metrics)
        
        @self.app.route('/api/agent/<agent_id>/command', methods=['POST'])
        async def api_agent_command(agent_id):
            """API endpoint for sending commands to agents"""
            data = request.get_json()
            command = data.get('command')
            params = data.get('params', {})
            
            result = await self.agent_manager.send_command(agent_id, command, params)
            return jsonify(result)
        
        @self.app.route('/api/agent/<agent_id>/config', methods=['PUT'])
        async def api_agent_config(agent_id):
            """API endpoint for updating agent configuration"""
            config = request.get_json()
            result = await self.agent_manager.update_agent_config(agent_id, config)
            return jsonify(result)
        
        @self.app.route('/api/stats')
        def api_stats():
            """API endpoint for dashboard statistics"""
            agents = self.database.get_all_agents()
            
            stats = {
                'timestamp': datetime.now().isoformat(),
                'total_agents': len(agents),
                'online_agents': len([a for a in agents if a.status == 'online']),
                'offline_agents': len([a for a in agents if a.status == 'offline']),
                'error_agents': len([a for a in agents if a.status == 'error']),
                'total_events_per_minute': sum(a.events_per_minute for a in agents),
                'average_health_score': sum(a.health_score for a in agents) / max(1, len(agents))
            }
            
            return jsonify(stats)
    
    def _setup_socketio(self) -> None:
        """Setup SocketIO event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            """Handle client connection"""
            self.logger.info(f"Client connected: {request.sid}")
            emit('connected', {'message': 'Connected to SecureWatch Console'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection"""
            self.logger.info(f"Client disconnected: {request.sid}")
        
        @self.socketio.on('subscribe_agent')
        def handle_subscribe_agent(data):
            """Subscribe to agent updates"""
            agent_id = data.get('agent_id')
            self.logger.info(f"Client {request.sid} subscribed to agent {agent_id}")
            # Join room for agent-specific updates
            # join_room(f"agent_{agent_id}")
    
    async def start(self, host='0.0.0.0', port=8080, debug=False):
        """Start the management console"""
        # Start agent manager
        await self.agent_manager.start()
        
        self.logger.info(f"Starting SecureWatch Management Console on {host}:{port}")
        
        # Start background task for real-time updates
        asyncio.create_task(self._broadcast_updates())
        
        # Run Flask app with SocketIO
        self.socketio.run(self.app, host=host, port=port, debug=debug)
    
    async def stop(self):
        """Stop the management console"""
        await self.agent_manager.stop()
        self.logger.info("Management console stopped")
    
    async def _broadcast_updates(self):
        """Broadcast real-time updates to connected clients"""
        while True:
            try:
                # Get current stats
                agents = self.database.get_all_agents()
                stats = {
                    'timestamp': datetime.now().isoformat(),
                    'total_agents': len(agents),
                    'online_agents': len([a for a in agents if a.status == 'online']),
                    'offline_agents': len([a for a in agents if a.status == 'offline']),
                    'error_agents': len([a for a in agents if a.status == 'error']),
                    'total_events_per_minute': sum(a.events_per_minute for a in agents)
                }
                
                # Broadcast to all connected clients
                self.socketio.emit('stats_update', stats)
                
                # Broadcast individual agent updates
                for agent in agents:
                    self.socketio.emit('agent_update', asdict(agent))
                
                await asyncio.sleep(10)  # Update every 10 seconds
                
            except Exception as e:
                self.logger.error(f"Broadcast update error: {e}")
                await asyncio.sleep(5)


async def main():
    """Main entry point for management console"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SecureWatch Agent Management Console')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--config-dir', default='./console_config', 
                       help='Configuration directory')
    parser.add_argument('--db-path', default='./console.db', 
                       help='Database file path')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO if not args.debug else logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and start console
    console = ManagementConsole(args.config_dir, args.db_path)
    
    try:
        await console.start(args.host, args.port, args.debug)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        await console.stop()


if __name__ == '__main__':
    asyncio.run(main())