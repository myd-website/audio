import { defineStore } from 'pinia';

export const useMusicStore = defineStore('music', {
  state: () => ({
    playlist: [], // 播放列表
    currentTrack: null, // 当前播放的歌曲
    isPlaying: false, // 是否正在播放
  }),
  
  actions: {
    // 添加到播放列表
    addToPlaylist(track) {
      this.playlist.push(track);
    },
    
    // 从播放列表移除
    removeFromPlaylist(trackId) {
      const index = this.playlist.findIndex(t => t.id === trackId);
      if (index !== -1) {
        this.playlist.splice(index, 1);
      }
    },
    
    // 清空播放列表
    clearPlaylist() {
      this.playlist = [];
      this.currentTrack = null;
      this.isPlaying = false;
    },
    
    // 播放歌曲
    playTrack(track) {
      if (this.currentTrack?.id === track.id) {
        // 如果是同一首歌，切换播放/暂停状态
        this.isPlaying = !this.isPlaying;
      } else {
        // 否则播放这首歌
        this.currentTrack = track;
        this.isPlaying = true;
      }
    },
    
    // 停止播放
    stopTrack() {
      this.isPlaying = false;
    },
    
    // 暂停播放（用于播放器控制）
    pauseTrack() {
      this.isPlaying = false;
    },
    
    // 恢复播放（用于播放器控制）
    resumeTrack() {
      this.isPlaying = true;
    },
    
    // 设置当前播放歌曲
    setCurrentTrack(track) {
      this.currentTrack = track;
    },
    
    // 切换播放状态（用于播放器控制）
    togglePlayStatus() {
      this.isPlaying = !this.isPlaying;
    },
  },
});
