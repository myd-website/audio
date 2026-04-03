import axios from 'axios';
import { showToast } from 'vant';

// 创建 axios 实例
const request = axios.create({
  baseURL: 'https://www.qqmp3.vip/api',
  timeout: 10000, // 请求超时时间
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 可以在这里添加 token 等通用配置
    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    const res = response.data;
    
    // 如果返回的状态码不是 200，说明接口有错误
    if (res.code !== 200) {
      showToast(res.msg || '接口请求失败');
      return Promise.reject(new Error(res.msg || '接口请求失败'));
    }
    
    return res;
  },
  error => {
    console.error('响应错误:', error);
    let message = '网络错误，请稍后重试';
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误';
          break;
        case 401:
          message = '未授权，请重新登录';
          break;
        case 403:
          message = '拒绝访问';
          break;
        case 404:
          message = '请求地址不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        case 502:
          message = '网关错误';
          break;
        case 503:
          message = '服务不可用';
          break;
        case 504:
          message = '网关超时';
          break;
        default:
          message = `连接错误${error.response.status}`;
      }
    } else if (error.request) {
      message = '无法连接到服务器，请检查网络';
    }
    
    showToast(message);
    return Promise.reject(error);
  }
);

export default request;
