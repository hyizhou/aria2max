#!/usr/bin/env node

import { Command } from 'commander'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pm2 = require('pm2')

interface PackageJson {
  version: string
}

const packageJson: PackageJson = require('../package.json')

const program = new Command()

program
  .name('aria2max')
  .description('A web-based panel for aria2 download manager')
  .version(packageJson.version)

// Start command
program
  .command('start')
  .description('Start aria-max server in background')
  .action(() => {
    console.log('Starting aria-max server...')

    pm2.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2.start({
        name: 'aria-max-server',
        script: path.resolve(__dirname, '../dist/server.js'),
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'production',
          PORT: String(process.env.PORT || 2999)
        },
        error_file: path.resolve(__dirname, '../logs/aria-max-err.log'),
        out_file: path.resolve(__dirname, '../logs/aria-max-out.log'),
        log_file: path.resolve(__dirname, '../logs/aria-max-combined.log'),
        time: true
      }, (err: Error) => {
        pm2.disconnect()
        if (err) {
          console.error('Failed to start aria-max server:', err)
          process.exit(2)
        }
        console.log('aria-max server started successfully!')
      })
    })
  })

// Stop command
program
  .command('stop')
  .description('Stop aria-max server')
  .action(() => {
    console.log('Stopping aria-max server...')

    pm2.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2.stop('aria-max-server', (err: Error) => {
        pm2.disconnect()
        if (err) {
          console.error('Failed to stop aria-max server:', err)
          process.exit(2)
        }
        console.log('aria-max server stopped successfully!')
      })
    })
  })

// Restart command
program
  .command('restart')
  .description('Restart aria-max server')
  .action(() => {
    console.log('Restarting aria-max server...')

    pm2.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2.restart('aria-max-server', (err: Error) => {
        pm2.disconnect()
        if (err) {
          console.error('Failed to restart aria-max server:', err)
          process.exit(2)
        }
        console.log('aria-max server restarted successfully!')
      })
    })
  })

// Status command
program
  .command('status')
  .description('Show aria-max server status')
  .action(() => {
    pm2.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2.describe('aria-max-server', (err: Error, apps: unknown[]) => {
        pm2.disconnect()
        if (err) {
          console.error('Failed to get server status:', err)
          process.exit(2)
        }

        if (apps.length === 0) {
          console.log('aria-max server is not running.')
          return
        }

        const app = apps[0] as {
          pm2_env?: {
            status?: string
            PORT?: string
            pm_uptime?: number
          }
          pid?: number
          monit?: {
            memory: number
            cpu: number
          }
        }

        console.log('aria-max server status:')
        console.log(`  Status: ${app.pm2_env?.status || 'unknown'}`)
        console.log(`  PID: ${app.pid}`)
        console.log(`  Port: ${app.pm2_env?.PORT || 2999}`)
        if (app.pm2_env?.pm_uptime) {
          const uptime = Math.floor((Date.now() - app.pm2_env.pm_uptime) / 1000)
          const hours = Math.floor(uptime / 3600)
          const minutes = Math.floor((uptime % 3600) / 60)
          const seconds = uptime % 60
          console.log(`  Uptime: ${hours}h ${minutes}m ${seconds}s`)
        }
        if (app.monit) {
          console.log(`  Memory: ${Math.round(app.monit.memory / 1024 / 1024)} MB`)
          console.log(`  CPU: ${app.monit.cpu}%`)
        }
      })
    })
  })

// Log command
program
  .command('log')
  .description('View aria-max server logs')
  .option('-n, --lines <number>', 'Output the last N lines', '20')
  .option('-f, --follow', 'Follow log output')
  .action((options: { lines: string; follow: boolean }) => {
    pm2.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      if (options.follow) {
        console.log('Following aria-max server logs (Press Ctrl+C to exit):')
        pm2.streamLogs('aria-max-server', 0)
      } else {
        const lineCount = parseInt(options.lines)
        pm2.logs('aria-max-server', lineCount, (err: Error) => {
          pm2.disconnect()
          if (err) {
            console.error('Failed to get logs:', err)
            process.exit(2)
          }
        })
      }
    })
  })

program.parse()
