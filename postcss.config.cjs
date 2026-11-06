const autoprefixer = require("autoprefixer");
const px2rem = require("postcss-pxtorem");

module.exports = {
  plugins: [
    autoprefixer(),
    px2rem({
      rootValue: 50,
      propList: ["*"],
      // 新模块及既有数学/待办页使用实际像素；旧页面暂保留原有 rem 规则。
      exclude:
        /node_modules|[\\/]src[\\/](?:app[\\/]|modules[\\/]|shared[\\/]|App\.vue|components[\\/](?:math|todo)[\\/]|views[\\/]TodoList\.vue)/,
    }),
  ],
};
