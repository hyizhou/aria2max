#!/usr/bin/env node

import { Command } from 'commander'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'

import pm2 from 'pm2'
import packageJson from '../package.json'

// pm2 type definitions are incomplete, cast to access full API
const pm2api = pm2 as any

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

    pm2api.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2api.start({
        name: 'aria-max-server',
        script: path.resolve(__dirname, '../server.js'),
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '512M',
        env: {
          NODE_ENV: 'production',
          PORT: String(process.env.PORT || 2999)
        },
        error_file: path.resolve(__dirname, '../logs/aria-max-err.log'),
        out_file: path.resolve(__dirname, '../logs/aria-max-out.log'),
        log_file: path.resolve(__dirname, '../logs/aria-max-combined.log'),
        time: true
      }, (err: Error) => {
        pm2api.disconnect()
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

    pm2api.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2api.stop('aria-max-server', (err: Error) => {
        pm2api.disconnect()
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

    pm2api.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2api.restart('aria-max-server', (err: Error) => {
        pm2api.disconnect()
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
    pm2api.connect((err: Error) => {
      if (err) {
        console.error('Failed to connect to PM2:', err)
        process.exit(2)
      }

      pm2api.describe('aria-max-server', (err: Error, apps: unknown[]) => {
        pm2api.disconnect()
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
  .option('-e, --error', 'Show error log instead of output log')
  .action((options: { lines: string; follow: boolean; error: boolean }) => {
    const logDir = path.resolve(__dirname, '../logs')
    const logFile = options.error
      ? path.join(logDir, 'aria-max-err-0.log')
      : path.join(logDir, 'aria-max-out-0.log')

    if (!fs.existsSync(logFile)) {
      console.log('No log file found:', logFile)
      return
    }

    try {
      if (options.follow) {
        execSync(`tail -f "${logFile}"`, { stdio: 'inherit' })
      } else {
        const lineCount = parseInt(options.lines)
        execSync(`tail -n ${lineCount} "${logFile}"`, { stdio: 'inherit' })
      }
    } catch (err) {
      process.exit((err as { status?: number }).status || 2)
    }
  })

// Passwd command
program
  .command('passwd')
  .description('Set or change the login password')
  .action(() => {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    // 配置文件路径
    const configFilePath = path.resolve(__dirname, '../src/server/config.json')

    rl.question('Enter new password (leave empty to remove password): ', (answer: string) => {
      const newPassword = answer.trim()

      // 读取现有配置
      let config: Record<string, unknown> = {}
      if (fs.existsSync(configFilePath)) {
        try {
          config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'))
        } catch {
          console.error('Failed to read config file')
          rl.close()
          process.exit(1)
        }
      }

      config.authPassword = newPassword

      try {
        const configDir = path.dirname(configFilePath)
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true })
        }
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2))
        if (newPassword) {
          console.log('Password has been set. Restart the server to apply.')
        } else {
          console.log('Password has been removed. Restart the server to apply.')
        }
      } catch (err) {
        console.error('Failed to write config file:', err)
        process.exit(1)
      }

      rl.close()
    })
  })

program.parse()
