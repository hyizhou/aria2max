<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTaskStore } from '@/store'
import { useRoute } from 'vue-router'

const route = useRoute()
const taskStore = useTaskStore()

const loading = ref(false)
const gid = ref<string>(route.params.gid as string)
const refreshInterval = ref<number | null>(null)

const startAutoRefresh = () => {
  // 先清理之前的定时器
  stopAutoRefresh()
  // 设置低频定时刷新，仅活跃任务需要更新
  refreshInterval.value = window.setInterval(() => {
    const currentTask = taskStore.currentTask
    if (currentTask && currentTask.status === 'active') {
      // 只有活跃任务才需要定期更新
      taskStore.fetchTaskDetail(gid.value)
    } else if (refreshInterval.value) {
      // 如果任务不是活跃状态，停止自动刷新
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }, 5000)  // 5秒一次
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

onMounted(async () => {
  await loadTaskDetail()
  
  // 只在任务是下载中状态时启动自动刷新
  const initialTask = taskStore.currentTask
  if (initialTask && initialTask.status === 'active') {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  // 页面销毁时清理定时器
  stopAutoRefresh()
})

const loadTaskDetail = async () => {
  loading.value = true
  try {
    await taskStore.fetchTaskDetail(gid.value)
    
    // 任务加载完成后，检查任务状态决定是否需要启动自动刷新
    const currentTask = taskStore.currentTask
    if (currentTask && currentTask.status === 'active' && !refreshInterval.value) {
      startAutoRefresh()
    } else if (currentTask && currentTask.status !== 'active' && refreshInterval.value) {
      // 如果任务状态变化为非活跃，停止自动刷新
      stopAutoRefresh()
    }
  } finally {
    loading.value = false
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B/s'
  return formatBytes(bytes) + '/s'
}

const formatDate = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString()
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: '下载中',
    waiting: '等待中',
    paused: '已暂停',
    error: '错误',
    complete: '已完成',
    removed: '已删除'
  }
  return statusMap[status] || status
}

const getProgressText = (): string => {
  if (!taskStore.currentTask) return '0%'
  if (taskStore.currentTask.totalLength === 0) return '0%'
  const progress = Math.round((taskStore.currentTask.completedLength / taskStore.currentTask.totalLength) * 100)
  return `${progress}%`
}

const getFileProgress = (file: any): number => {
  if (!file || !file.size || file.size === 0) return 0
  const completed = file.completed || 0
  return Math.round((completed / file.size) * 100)
}

const getShareRatio = computed(() => {
  if (!taskStore.currentTask) return 0
  const uploaded = parseInt(taskStore.currentTask.uploadLength || '0', 10)
  const downloaded = parseInt(taskStore.currentTask.completedLength || '0', 10)
  if (downloaded === 0) return 0
  return (uploaded / downloaded).toFixed(2)
})

const getTaskSpeed = (task: any) => {
  if (!task) return { upload: 0, download: 0 }
  return {
    upload: parseInt(task.uploadSpeed || task.uploadLength || '0', 10) || 0,
    download: parseInt(task.downloadSpeed || task.downloadLength || '0', 10) || 0
  }
}

const getTaskName = (): string => {
  const task = taskStore.currentTask
  if (!task) return '未知任务'
  
  // 对于BT任务，使用BT任务名称
  if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
    return task.bittorrent.info.name
  }
  
  // 对于普通任务，使用文件名
  if (task.files && task.files.length > 0) {
    const path = task.files[0].path
    return path.split('/').pop() || path
  }
  
  return '未知文件'
}

// 采样函数：从区块数组中采样指定数量的区块用于显示
const getSampledPieces = (pieces: number[], sampleCount: number): number[] => {
  if (!pieces || pieces.length === 0) return [];
  
  // 如果区块数量小于等于采样数量，直接返回
  if (pieces.length <= sampleCount) {
    return pieces;
  }
  
  // 否则进行采样
  const sampled = [];
  const step = pieces.length / sampleCount;
  
  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor(i * step);
    sampled.push(pieces[Math.min(index, pieces.length - 1)]);
  }
  
  return sampled;
}

// 解析对等方bitfield获取区块状态数组
const parsePeerBitfield = (bitfield: string, totalPieces: number): number[] => {
  if (!bitfield || totalPieces <= 0) return [];
  
  try {
    // 将十六进制字符串转换为字节数组
    const byteArray = new Uint8Array(Math.ceil(totalPieces / 8))
    for (let i = 0; i < bitfield.length && i < byteArray.length * 2; i += 2) {
      const hexByte = bitfield.substr(i, 2)
      const byteValue = parseInt(hexByte, 16)
      if (!isNaN(byteValue)) {
        byteArray[Math.floor(i / 2)] = byteValue
      }
    }
    
    // 解析字节数组获取区块状态数组
    const pieces = []
    for (let i = 0; i < totalPieces; i++) {
      const byteIndex = Math.floor(i / 8)
      const bitIndex = 7 - (i % 8) // bitfield使用大端序
      if (byteIndex < byteArray.length && (byteArray[byteIndex] & (1 << bitIndex))) {
        pieces.push(1) // 已拥有
      } else {
        pieces.push(0) // 未拥有
      }
    }
    
    return pieces
  } catch (e) {
    console.error('Failed to parse peer bitfield:', e)
    return []
  }
}

const getSeedersConnected = computed(() => {
  const task = taskStore.currentTask
  if (!task) return { seeders: 0, peers: 0 }
  
  // 从实际连接数据中统计
  const peers = getPeers.value
  const actualConnections = peers.length
  
  // 从任务基本信息中获取种子数
  const seeders = parseInt(String(task.numSeeders || '0'), 10) || 0
  
  // 如果有实际连接数据，优先使用实际连接数
  const totalConnections = actualConnections > 0 ? actualConnections : parseInt(String(task.connections || '0'), 10) || 0
  
  return {
    seeders: seeders,
    peers: totalConnections
  }
})

const getPiecesInfo = computed(() => {
  if (!taskStore.currentTask) return []
  
  // 从任务信息获取真实的区块数据
  const numPieces = parseInt(taskStore.currentTask.numPieces || '0', 10)
  const pieceLength = parseInt(taskStore.currentTask.pieceLength || '0', 10)
  const totalLength = parseInt(taskStore.currentTask.totalLength || '0', 10)
  
  if (numPieces === 0 || pieceLength === 0) return []
  
  // 根据bitfield判断每个区块的下载状态
  const bitfield = taskStore.currentTask.bitfield || ''
  const pieces = []
  
  // 解析bitfield获取真实的区块下载状态
  const downloadedPieces = parseBitfield(bitfield, numPieces)
  
  for (let i = 0; i < numPieces; i++) {
    const isDownloaded = downloadedPieces.has(i)
    const pieceStart = i * pieceLength
    const pieceEnd = Math.min((i + 1) * pieceLength, totalLength)
    const pieceSize = pieceEnd - pieceStart
    
    pieces.push({
      index: i,
      downloaded: isDownloaded,
      size: pieceSize,
      progressColor: isDownloaded ? '#4caf50' : '#e0e0e0'
    })
  }
  return pieces
})

// 解析bitfield获取已下载的区块索引集合
const parseBitfield = (bitfield: string, numPieces: number): Set<number> => {
  if (!bitfield) return new Set()
  
  try {
    // 将十六进制字符串转换为字节数组
    const byteArray = new Uint8Array(Math.ceil(numPieces / 8))
    for (let i = 0; i < bitfield.length && i < byteArray.length * 2; i += 2) {
      const hexByte = bitfield.substr(i, 2)
      const byteValue = parseInt(hexByte, 16)
      if (!isNaN(byteValue)) {
        byteArray[Math.floor(i / 2)] = byteValue
      }
    }
    
    // 解析字节数组获取已下载的区块
    const downloadedPieces = new Set<number>()
    for (let i = 0; i < numPieces; i++) {
      const byteIndex = Math.floor(i / 8)
      const bitIndex = 7 - (i % 8) // bitfield使用大端序
      if (byteIndex < byteArray.length && (byteArray[byteIndex] & (1 << bitIndex))) {
        downloadedPieces.add(i)
      }
    }
    
    return downloadedPieces
  } catch (e) {
    console.error('Failed to parse bitfield:', e)
    return new Set()
  }
}

const getPeers = computed(() => {
  const task = taskStore.currentTask
  if (!task) return []
  
  // 构建连接数据的通用函数 - 简化显示，避免过复杂处理
  const buildPeerInfo = (conn: any, index: number) => {
    if (!conn) return null
    
    // 获取总区块数
    const totalPieces = taskStore.currentTask ? parseInt(taskStore.currentTask.numPieces || '0', 10) : 0;
    
    // 解析 bitfield 字符串为二进制数组
    let pieces = [];
    if (conn.bitfield && totalPieces > 0) {
      // 使用精确解析函数获取区块状态数组
      pieces = parsePeerBitfield(conn.bitfield, totalPieces);
    } else if (conn.bitfield) {
      // 兼容旧的解析方式
      pieces = hexToBinaryArray(conn.bitfield);
    }
    
    // 基于 bitfield 计算准确的进度
    let calculatedProgress = 0;
    // 如果是对等方是种子，进度为100%
    if (conn.seeder === 'true') {
      calculatedProgress = 100;
    } else if (pieces.length > 0) {
      const ownedPieces = pieces.filter(piece => piece === 1).length;
      calculatedProgress = Math.round((ownedPieces / pieces.length) * 100);
    } else if (conn.progress) {
      // 如果没有 bitfield，使用服务器提供的进度
      calculatedProgress = Math.min(100, Math.max(0, Math.round(parseFloat(conn.progress || '0') * 100)));
    }
    
    // 处理 peerId - 先URL解码，再解析客户端
    let decodedPeerId = '未知ID';
    const originalPeerId = conn.peerId || conn.id || '';
    
    if (originalPeerId) {
      // 特殊测试
      if (originalPeerId === '%2DXL0019%2Da%1A%3A%D6%86%60%F2%EE%AB4%04%98') {
        console.log('Special test peerId found!');
      }
      // console.log('Processing peerId:', originalPeerId, 'conn.peerId:', conn.peerId, 'conn.id:', conn.id);
      
      // 强行解码，即使格式不完美
    if (originalPeerId && originalPeerId.startsWith('%')) {
      try {
        decodedPeerId = decodeURIComponent(originalPeerId);
      } catch (e) {
        // 强行解码：逐个字符解码，失败的保持原样
        let result = '';
        for (let i = 0; i < originalPeerId.length; i++) {
          if (originalPeerId[i] === '%' && i + 2 < originalPeerId.length) {
            const nextChar = originalPeerId[i + 1];
            const nextNextChar = originalPeerId[i + 2];
            // 检查是否是有效的十六进制字符
            if (/[0-9A-Fa-f]/.test(nextChar) && /[0-9A-Fa-f]/.test(nextNextChar)) {
              try {
                const hex = originalPeerId.substring(i, i + 3);
                result += decodeURIComponent(hex);
                i += 2; // 跳过已处理的两个字符
              } catch (subE) {
                // 解码失败，保持原样
                result += originalPeerId[i];
              }
            } else {
              // 不是有效的十六进制，保持原样
              result += originalPeerId[i];
            }
          } else {
            result += originalPeerId[i];
          }
        }
        decodedPeerId = result;
      }
    } else {
      decodedPeerId = originalPeerId;
    }
    }
    
    // 提取客户端名称 - 简化映射关系
    let clientName = '未知客户端';
    
    // 首先尝试解码后的值
    if (decodedPeerId && decodedPeerId.startsWith('-')) {
      const prefix = decodedPeerId.substring(0, 4); // 前4个字符（包括-）
      
      switch (prefix) {
        case '-XL0':
          clientName = '迅雷 (Xunlei)';
          break;
        case '-XF9':
        case '-XF1':
        case '-XF':
          clientName = 'Xfplay';
          break;
        case '-BC0':
        case '-BC1':
        case '-BC2':
        case '-BC':
          clientName = 'BitComet';
          break;
        case '-FD':
          clientName = 'Free Download Manager';
          break;
        case '-BT':
          clientName = 'BitTorrent';
          break;
        case '-UT3':
        case '-UT2':
        case '-UT':
          clientName = 'uTorrent';
          break;
        case '-TR':
          clientName = 'Transmission';
          break;
        case '-QT':
          clientName = 'qBittorrent';
          break;
        case '-AZ':
          clientName = 'Vuze';
          break;
        case '-DE':
          clientName = 'Deluge';
          break;
        case '-LT':
          clientName = 'libTorrent';
          break;
        case '-XL':
          clientName = '迅雷 (Xunlei)';
          break;
      }
    }
    // 如果解码失败，尝试原始值
    else if (originalPeerId && originalPeerId.startsWith('%2D')) {
      const prefix = originalPeerId.substring(0, 6); // 前6个字符（包括%2D）
      switch (prefix) {
        case '%2DXL0':
          clientName = '迅雷 (Xunlei)';
          break;
        case '%2DXF9':
        case '%2DXF1':
        case '%2DXF':
          clientName = 'Xfplay';
          break;
        case '%2DBC0':
        case '%2DBC1':
        case '%2DBC2':
        case '%2DBC':
          clientName = 'BitComet';
          break;
        case '%2DFD':
          clientName = 'Free Download Manager';
          break;
        case '%2DBT':
          clientName = 'BitTorrent';
          break;
        case '%2DUT3':
        case '%2DUT2':
        case '%2DUT':
          clientName = 'uTorrent';
          break;
        case '%2DTR':
          clientName = 'Transmission';
          break;
        case '%2DQT':
          clientName = 'qBittorrent';
          break;
        case '%2DAZ':
          clientName = 'Vuze';
          break;
        case '%2DDE':
          clientName = 'Deluge';
          break;
        case '%2DLT':
          clientName = 'libTorrent';
          break;
        case '%2DXL':
          clientName = '迅雷 (Xunlei)';
          break;
      }
    }
    // 其他简单匹配
    else if (decodedPeerId.startsWith('aria2/')) {
      clientName = 'Aria2';
    } else if (decodedPeerId.startsWith('BT/')) {
      clientName = '迅雷在线 (Xunlei)';
    } else if (decodedPeerId.startsWith('Xunlei/')) {
      clientName = '迅雷 (Xunlei)';
    } else if (decodedPeerId.startsWith('XL/')) {
      clientName = '迅雷 (Xunlei)';
    } else if (decodedPeerId.includes('BitTorrent')) {
      clientName = 'BitTorrent';
    } else if (decodedPeerId.includes('uTorrent')) {
      clientName = 'uTorrent';
    } else if (decodedPeerId.includes('Transmission')) {
      clientName = 'Transmission';
    } else if (decodedPeerId.includes('qBittorrent')) {
      clientName = 'qBittorrent';
    } else if (decodedPeerId.includes('libtorrent')) {
      clientName = 'libTorrent';
    } else if (decodedPeerId.includes('Deluge')) {
      clientName = 'Deluge';
    } else if (decodedPeerId.includes('Vuze')) {
      clientName = 'Vuze';
    } else if (decodedPeerId.includes('BitComet')) {
      clientName = 'BitComet';
    } else if (decodedPeerId.includes('FDM')) {
      clientName = 'Free Download Manager';
    }
    
    // 显示解码后的peerId（如果有的话）
    let displayPeerId = decodedPeerId !== '未知ID' ? decodedPeerId : (conn.peerId || conn.id || '未知ID');
    
    return {
      ip: String(conn.ip || conn.address || conn.host || '未知IP'),
      client: String(clientName || decodedPeerId || conn.client || conn.user_agent || '未知客户端').substring(0, 50), // 限制长度
      progress: calculatedProgress, // 使用基于 bitfield 计算的进度
      uploadSpeed: Math.max(0, parseInt(String(conn.uploadSpeed || conn.upload_speed || '0'), 10)),
      downloadSpeed: Math.max(0, parseInt(String(conn.downloadSpeed || conn.download_speed || '0'), 10)),
      peerId: displayPeerId, // 显示解码后的peerId
      _originalPeerId: conn.peerId || conn.id, // 调试用：原始peerId
      pieces: pieces, // 添加区块信息
      bitfield: conn.bitfield || '', // 保留原始bitfield
      amChoking: conn.amChoking === 'true', // 我方是否限制对方
      peerChoking: conn.peerChoking === 'true', // 对方是否限制我方
      seeder: conn.seeder === 'true', // 是否为种子
      port: conn.port || '未知端口' // 端口号
    }
  }
  
  // 将十六进制字符串转换为二进制数组的辅助函数
  const hexToBinaryArray = (hex: string): number[] => {
    if (!hex) return [];
    
    try {
      // 将十六进制字符串转换为字节数组
      const byteArray = [];
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const byteValue = parseInt(hexByte, 16);
        if (!isNaN(byteValue)) {
          byteArray.push(byteValue);
        }
      }
      
      // 将字节数组转换为二进制数组
      const binaryArray = [];
      for (let i = 0; i < byteArray.length; i++) {
        const byte = byteArray[i];
        // 将字节转换为8位二进制（从最高位到最低位）
        for (let j = 7; j >= 0; j--) {
          binaryArray.push((byte >> j) & 1);
        }
      }
      
      return binaryArray;
    } catch (e) {
      console.error('Failed to parse bitfield:', e);
      return [];
    }
  }
  
  // 1. 优先从 task.peers 获取连接信息（后端通过 aria2.getPeers 获取的）
  if (task.peers && Array.isArray(task.peers) && task.peers.length > 0) {
    // 检查是否是占位符数据（空对象）
    const hasValidPeerData = task.peers.some(peer => peer && Object.keys(peer).length > 0);
    if (hasValidPeerData) {
      return task.peers.map(buildPeerInfo).filter(Boolean)
    }
    // 如果是占位符数据，继续执行下面的逻辑
  }
  
  // 2. 从 bittorrent 相关字段获取连接信息
  if (task.bittorrent) {
    const btConnections = task.bittorrent.connections || task.bittorrent.connectionsList || []
    const btPeers = task.bittorrent.peers || []
    const btData = [...btConnections, ...btPeers].filter(conn => conn && typeof conn === 'object')
    if (btData.length > 0) {
      return btData.map(buildPeerInfo).filter(Boolean)
    }
  }
  
  // 3. 从其他可能的字段获取
  const connectionSources = [
    task.connections,
    task.peers,
    task.serverKeptConnections
  ].filter(source => Array.isArray(source) && source.length > 0)
  
  if (connectionSources.length > 0) {
    const allConnections = connectionSources.flat()
    return allConnections.map(buildPeerInfo).filter(Boolean)
  }
  
  // 4. 只有连接数量但没有具体数据时显示占位符
  // 特别处理：如果peers字段存在且是空数组，说明服务器明确返回了空连接状态，不应显示占位符
  try {
    const connectionsCount = parseInt(String(task.connections || task.numConnections || task.activeConnections), 10)
    const hasRealConnections = connectionsCount > 0
    const hasPeerData = task.peers && Array.isArray(task.peers) && task.peers.length > 0
    const isPeersEmptyArray = task.peers && Array.isArray(task.peers) && task.peers.length === 0
    
    // 只有在以下情况才显示占位符：
    // 1. 有实际连接数
    // 2. 没有具体的peer数据
    // 3. peers字段不是空数组（空数组表示服务器明确返回了空状态）
    if (hasRealConnections && !hasPeerData && !isPeersEmptyArray) {
      return Array.from({ length: Math.min(connectionsCount, 5) }, (_, index) => buildPeerInfo({}, index))
    }
  } catch {
    // 忽略解析错误
  }
  
  return []
})

const handleAction = async (action: string) => {
  try {
    switch (action) {
      case 'pause':
        await taskStore.pauseTask(gid.value)
        break
      case 'resume':
        await taskStore.resumeTask(gid.value)
        break
      case 'delete':
        await taskStore.deleteTask(gid.value)
        break
    }
    await loadTaskDetail()
  } catch (error) {
    console.error('Task action failed:', error)
  }
}
</script>

<template>
  <div class="task-detail">
    <div class="page-header">
      <button class="back-button" @click="$router.back()">
        ← 返回
      </button>
      <h2>任务详情</h2>
    </div>
    
    <div v-if="loading" class="loading">
      <p>加载中...</p>
    </div>
    
    <div v-else-if="taskStore.currentTask" class="task-detail-content">
      <div class="task-summary">
        <div class="task-header">
          <h3>{{ getTaskName() }}</h3>
        </div>
        
        <div class="task-info-grid">
          <div class="info-item">
            <label>任务大小:</label>
            <span>{{ formatBytes(taskStore.currentTask.totalLength) }}</span>
          </div>
          
          <div class="info-item">
            <label>任务状态:</label>
            <span class="status-badge" :class="'status-' + taskStore.currentTask.status">
              {{ getStatusText(taskStore.currentTask.status) }}
            </span>
          </div>
          
          <div class="info-item">
            <label>进度 (健康度):</label>
            <span>{{ getProgressText() }}</span>
          </div>
          
          <div class="info-item">
            <label>下载数据量:</label>
            <span>{{ formatBytes(taskStore.currentTask.completedLength) }}</span>
          </div>
          
          <div class="info-item">
            <label>上传数据量:</label>
            <span>{{ formatBytes(taskStore.currentTask.uploadLength || 0) }}</span>
          </div>
          
          <div class="info-item">
            <label>分享率:</label>
            <span>{{ getShareRatio }}</span>
          </div>
          
          <div class="info-item">
            <label>种子数/连接数:</label>
            <span>{{ getSeedersConnected.seeders }} / {{ getSeedersConnected.peers }}</span>
          </div>
          
          <div class="info-item">
            <label>特征值:</label>
            <span>{{ taskStore.currentTask.bittorrent?.info?.infoHash || taskStore.currentTask.gid }}</span>
          </div>
          
          <div class="info-item">
            <label>下载路径:</label>
            <span>{{ taskStore.currentTask.dir || taskStore.currentTask.files?.[0]?.path?.split('/').slice(0, -1).join('/') || '未知' }}</span>
          </div>
        </div>
      </div>
      
      <!-- 区块信息 -->
      <div class="task-pieces" v-if="parseInt(taskStore.currentTask.numPieces || '0', 10) > 0">
        <h4>区块信息</h4>
        <div class="pieces-chart">
          <div class="pieces-display">
            <div 
              v-for="(piece, index) in getPiecesInfo" 
              :key="index"
              class="piece-item"
              :class="{ completed: piece.downloaded }"
              :title="`区块 ${index + 1}: ${piece.downloaded ? '已下载' : '未下载'} - ${formatBytes(piece.size)}`"
              :style="{ backgroundColor: piece.progressColor }"
            ></div>
          </div>
          <div class="pieces-stats">
            <span>{{ getPiecesInfo.filter(p => p.downloaded).length }} / {{ getPiecesInfo.length }} 区块已下载 ({{ Math.round((getPiecesInfo.filter(p => p.downloaded).length/getPiecesInfo.length) * 100) }}%)</span>
          </div>
        </div>
      </div>
      
      <!-- 连接状态 -->
      <div class="task-peers">
        <div class="peers-header">
          <h4>连接状态 ({{ getPeers.length }} 个连接)</h4>
          <div class="task-speed-info">
            <span class="speed-badge upload">↑ {{ formatSpeed(getTaskSpeed(taskStore.currentTask).upload) }}</span>
            <span class="speed-badge download">↓ {{ formatSpeed(getTaskSpeed(taskStore.currentTask).download) }}</span>
          </div>
        </div>
        <div class="peer-list" v-if="getPeers.length > 0">
          <div 
            v-for="(peer, index) in getPeers" 
            :key="index"
            class="peer-item"
          >
            <div class="peer-info">
              <div class="peer-ip">{{ peer.ip }}:{{ peer.port }}</div>
              <div class="peer-client">{{ peer.client }}</div>
              <div class="peer-id" v-if="peer.peerId && peer.peerId !== '未知ID'">{{ peer.peerId }}</div>
              <!-- 调试信息：显示原始peerId -->
              <div class="peer-debug" v-if="peer._originalPeerId && peer._originalPeerId !== peer.peerId" style="font-size: 0.7em; color: #999;">
                原始: {{ peer._originalPeerId }}<br>
                显示: {{ peer.peerId }}
              </div>
              <div class="peer-status-tags">
                <span v-if="peer.seeder" class="status-tag seeder" title="种子：已完整拥有所有文件数据的对等方">Seeder</span>
                <span v-if="peer.amChoking" class="status-tag choking" title="我方限制：我方暂时不向此对等方上传数据">AmChoking</span>
                <span v-if="peer.peerChoking" class="status-tag choked" title="对方限制：对方暂时不向我方上传数据">PeerChoking</span>
              </div>
            </div>
            <div class="peer-pieces" v-if="peer.pieces && peer.pieces.length > 0">
              <div class="pieces-bar">
                <div 
                  v-for="(piece, pieceIndex) in getSampledPieces(peer.pieces, 100)" 
                  :key="pieceIndex"
                  class="piece-block"
                  :class="{ 'has-piece': piece === 1, 'missing-piece': piece === 0 }"
                  :title="`区块 ${pieceIndex + 1}: ${piece === 1 ? '已拥有' : '未拥有'}`"
                ></div>
              </div>
              <div class="pieces-info">
                <div class="progress-percent">{{ peer.progress }}%</div>
              </div>
            </div>
            <div class="peer-pieces-summary" v-else>
              <div class="pieces-info">
                <div class="progress-percent">{{ peer.progress }}%</div>
              </div>
            </div>
            <!-- 移除了单独的进度显示，因为在区块信息中已经显示了 -->
            <div class="peer-speed">
              <span class="upload-speed">↓ {{ formatSpeed(peer.uploadSpeed) }}</span>
              <span class="download-speed">↑ {{ formatSpeed(peer.downloadSpeed) }}</span>
            </div>
          </div>
        </div>
        <p v-else style="text-align: center; color: #999; font-size: 0.875rem; padding: 1rem;">
          暂无连接信息
        </p>
      </div>
      
      <div class="task-files">
        <h4>文件列表</h4>
        <div class="file-list">
          <div 
            v-for="(file, index) in taskStore.currentTask.files" 
            :key="index"
            class="file-item"
          >
            <div class="file-info">
              <div class="file-name">{{ file.path ? file.path.split('/').pop() : file.name || '未知文件' }}</div>
              <div class="file-size">{{ formatBytes(file.size || 0) }}</div>
            </div>
            <div class="file-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: getFileProgress(file) + '%' }"
                ></div>
              </div>
              <div class="progress-text">
                {{ getFileProgress(file) }}% - {{ formatBytes(file.completed || 0) }} / {{ formatBytes(file.size || 0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>未找到任务信息</p>
    </div>
  </div>
</template>

<style scoped>
.task-detail {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-button {
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
}

.loading, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #999999;
}

.task-detail-content {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.task-summary {
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.task-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
}

.btn-danger {
  background-color: #f44336;
  color: #ffffff;
  border-color: #f44336;
}

.btn-danger:hover {
  background-color: #d32f2f;
  border-color: #d32f2f;
}

.task-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-weight: 500;
  color: #666666;
  margin-bottom: 0.25rem;
}

.info-item span {
  color: #333333;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.status-active {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-badge.status-waiting {
  background-color: #e3f2fd;
  color: #2196f3;
}

.status-badge.status-paused {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-badge.status-error {
  background-color: #ffebee;
  color: #f44336;
}

.status-badge.status-complete {
  background-color: #f3e5f5;
  color: #9c27b0;
}

.task-files {
  padding: 1.5rem;
}

.task-files h4 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333333;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-item {
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.task-pieces,
.task-peers {
  padding: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.task-pieces h4,
.task-peers h4 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333333;
}

.peers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.task-speed-info {
  display: flex;
  gap: 0.75rem;
}

.speed-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.speed-badge.upload {
  background-color: #e8f5e9;
  color: #4caf50;
  border-color: #c8e6c9;
}

.speed-badge.download {
  background-color: #e3f2fd;
  color: #2196f3;
  border-color: #bbdefb;
}

.speed-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pieces-chart {
  margin-bottom: 1rem;
}

.pieces-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10px, 1fr));
  gap: 2px;
  margin-bottom: 0.5rem;
  max-width: 100%;
  overflow-x: auto;
}

.piece-item {
  width: 10px;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 1px;
  cursor: help;
}

.piece-item.completed {
  background-color: #4caf50;
}

.pieces-stats {
  font-size: 0.875rem;
  color: #666666;
}

.peer-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.peer-item {
  display: grid;
  grid-template-columns: 2fr 150px 150px;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.peer-info {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止溢出 */
}

.peer-ip {
  font-weight: 500;
  color: #333333;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
  word-break: break-all;
}

.peer-client {
  color: #666666;
  font-size: 0.75rem;
  word-break: break-all;
}

.peer-id {
  color: #999999;
  font-size: 0.6875rem;
  font-family: monospace;
  word-break: break-all;
  margin-top: 0.125rem;
}

.peer-status-tags {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.status-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 500;
}

.status-tag.seeder {
  background-color: #4caf50;
  color: white;
}

.status-tag.choking {
  background-color: #ff9800;
  color: white;
}

.status-tag.choked {
  background-color: #f44336;
  color: white;
}

.peer-status {
  text-align: center;
  min-width: 80px;
}

.status-text {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background-color: #e3f2fd;
  color: #2196f3;
  white-space: nowrap;
}

.peer-progress {
  text-align: center;
  min-width: 60px;
}

.progress-number {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
}


.peer-speed {
  text-align: right;
  min-width: 100px;
}

.peer-pieces {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
}

.pieces-bar {
  display: flex;
  width: 100%;
  height: 12px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.piece-block {
  flex: 1;
  height: 100%;
  background-color: #e0e0e0;
  margin: 0; /* 去除区块之间的间隙 */
}

.piece-block.has-piece {
  background-color: #4caf50;
}

.piece-block.missing-piece {
  background-color: #e0e0e0;
}

.pieces-info {
  font-size: 0.75rem;
  color: #666666;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.progress-bar-small {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  margin: 2px 0;
}

.progress-fill-small {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-percent {
  margin-top: 2px;
  font-weight: 500;
}

.peer-pieces-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
}

.upload-speed {
  display: block;
  font-size: 0.75rem;
  color: #4caf50;
  margin-bottom: 0.125rem;
}

.download-speed {
  display: block;
  font-size: 0.75rem;
  color: #2196f3;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .peer-item {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    grid-template-areas: 
      "info info"
      "pieces pieces"
      "speed speed";
  }
  
  .peer-info {
    grid-area: info;
  }
  
  .peer-pieces {
    grid-area: pieces;
    text-align: left;
    min-width: auto;
  }
  
  .peer-speed {
    grid-area: speed;
    text-align: left;
  }
  
  .pieces-display {
    grid-template-columns: repeat(20, 1fr);
  }
}

@media (max-width: 480px) {
  .pieces-display {
    grid-template-columns: repeat(15, 1fr);
  }
  
  .peer-item {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  
  .peer-ip {
    font-size: 0.75rem;
  }
  
  .peer-client {
    font-size: 0.6875rem;
  }
  
  .peer-id {
    font-size: 0.625rem;
  }
  
  .pieces-bar {
    height: 12px;
  }
  
  .pieces-info {
    font-size: 0.6875rem;
  }
  
  .upload-speed,
  .download-speed {
    font-size: 0.6875rem;
  }
}

.file-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.file-name {
  font-weight: 500;
  color: #333333;
  word-break: break-all;
}

.file-size {
  color: #666666;
  white-space: nowrap;
  margin-left: 1rem;
}

.file-progress {
  margin-top: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: #666666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-detail {
    padding: 1rem;
  }
  
  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .task-info-grid {
    grid-template-columns: 1fr;
  }
  
  .file-info {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .file-size {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .peers-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .task-speed-info {
    width: 100%;
    justify-content: space-between;
  }

  .speed-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .peer-item {
    display: flex !important;
    flex-direction: column;
    align-items: flex-start !important;
    text-align: left !important;
    gap: 0.25rem;
    padding: 0.75rem;
  }

  .peer-info,
  .peer-status,
  .peer-progress,
  .peer-pieces,
  .peer-speed {
    text-align: left !important;
    min-width: auto;
    width: 100%;
  }

  .peer-speed {
    display: flex;
    gap: 1rem;
    justify-content: flex-start;
  }

  .upload-speed,
  .download-speed {
    display: inline-block;
    font-size: 0.6875rem;
  }
}

@media (max-width: 480px) {
  .peer-item {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  
  .peer-ip {
    font-size: 0.75rem;
  }
  
  .peer-client {
    font-size: 0.6875rem;
  }
}
</style>