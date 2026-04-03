import request from "./api";

/**
 * 音乐相关 API 接口
 */
export const musicAPI = {
  /**
   * 搜索歌曲
   * @param {string} keyword - 搜索关键词
   * @returns {Promise}
   */
  searchSongs(keyword) {
    return request({
      url: "/songs.php",
      method: "get",
      params: {
        type: "search",
        keyword: keyword,
      },
    });
  },

  /**
   * 获取歌曲详情
   * @param {string} id - 歌曲 ID
   * @returns {Promise}
   */
  getSongDetail(rid) {
    return request({
      url: `/kw.php`,
      method: "get",
      params: {
        type: "json", // json/mp3/pic
        level: "exhigh", // standard,低音质，exhigh,高音质，lossless,无损音质，aac，wma，ape这三个不知
        lrc: true, // true/false，是否歌词改变歌词格式
        rid, // 歌曲id
      },
    });
  },

  /**
   * 获取热门歌曲
   * @returns {Promise}
   */
  getHotSongs() {
    return request({
      url: "/songs.php",
      method: "get",
      params: {
        type: "hot",
      },
    });
  },

  /**
   * 获取新歌榜
   * @returns {Promise}
   */
  getNewSongs() {
    return request({
      url: "/songs.php",
      method: "get",
      params: {
        type: "new",
      },
    });
  },

  /**
   * 获取网络歌曲
   * @returns {Promise}
   */
  getNetworkSongs() {
    return request({
      url: "/songs.php",
      method: "get",
      params: {
        type: "net",
      },
    });
  },
};

/**
 * 其他业务 API 可以在这里添加
 * 例如：
 * export const userAPI = { ... }
 * export const playlistAPI = { ... }
 */

export default musicAPI;
