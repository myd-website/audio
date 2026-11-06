const autoprefixer = require("autoprefixer");
const px2rem = require("postcss-pxtorem");

module.exports = {
  plugins: [
    autoprefixer(),
    px2rem({
      rootValue: 50,
      propList: ["*"],
      // 数学和待办页使用响应式布局，保留实际像素，避免手机输入字号和触控区域随 rem 缩小。
      exclude:
        /[\\/]src[\\/](?:components[\\/](?:math|todo)[\\/]|views[\\/]TodoList\.vue)/,
    }),
  ],
};
