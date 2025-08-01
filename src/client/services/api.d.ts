// API服务类型声明
declare module '@/services/api' {
  export const taskApi: {
    getTasks(): Promise<any>;
    addTask(data: any): Promise<any>;
    addTorrentFile(file: File, options?: any): Promise<any>;
    addMetalinkFile(file: File, options?: any): Promise<any>;
    getTaskDetail(gid: string): Promise<any>;
    pauseTask(gid: string): Promise<any>;
    resumeTask(gid: string): Promise<any>;
    deleteTask(gid: string, deleteFile?: boolean): Promise<any>;
  };

  export const fileApi: {
    getFiles(path?: string): Promise<any>;
    downloadFile(path: string): Promise<any>;
    deleteFile(path: string): Promise<any>;
    createDirectory(path: string): Promise<any>;
    renameFile(oldPath: string, newPath: string): Promise<any>;
    uploadFile(file: File, path?: string, onUploadProgress?: any): Promise<any>;
  };

  export const systemApi: {
    getSystemStatus(): Promise<any>;
    getSystemInfo(): Promise<any>;
    getConfig(): Promise<any>;
    saveConfig(config: any): Promise<any>;
    testConnection(): Promise<any>;
    getRealtimeSpeed(): Promise<any>;
    getDeviceNetworkSpeed(): Promise<any>;
  };
}