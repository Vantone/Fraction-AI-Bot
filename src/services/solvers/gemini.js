// 导入 Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";
// 导入工具类，用于日志记录
import Tools from "../../utils/tools.js";

/**
 * Gemini验证码求解器类
 * 使用 Google Gemini AI 模型来识别验证码图片
 */
class GeminiSolver {
  /**
   * 构造函数
   * @param {string} apiKey - Gemini API密钥
   */
  constructor(apiKey) {
    this.initialize(apiKey);
  }

  /**
   * 初始化Gemini客户端
   * @param {string} apiKey - Gemini API密钥
   * @throws {Error} 当API密钥未提供时抛出错误
   */
  initialize(apiKey) {
    if (!apiKey) {
      throw new Error("需要提供 Gemini API 密钥");
    }
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    Tools.log("Gemini 初始化成功");
  }

  /**
   * 解析验证码图片
   * @param {string} base64Image - Base64编码的图片数据
   * @returns {Promise<string>} 返回识别出的验证码文本
   * @throws {Error} 当识别过程出错时抛出错误
   */
  async solve(base64Image) {
    try {
      Tools.log("正在使用 Gemini 识别验证码...");

      // 设置提示词，要求模型只返回验证码文本
      const prompt =
        "Please identify and provide only the text/numbers shown in this captcha image. Format the answer as plain text without any additional explanation or punctuation. Provide the result in ALL UPPERCASE LETTERS.";

      // 准备图片数据
      const image = {
        inlineData: {
          data: base64Image,
          mimeType: "image/png",
        },
      };

      // 调用Gemini API进行图片识别
      const result = await this.model.generateContent([prompt, image]);
      const captchaText = result.response.text().trim();
      const cleanedCaptchaText = captchaText.replace(/\s/g, "").toUpperCase();

      Tools.log(`Gemini 验证码识别结果: ${cleanedCaptchaText}`);
      return cleanedCaptchaText;
    } catch (error) {
      Tools.log(`Gemini 识别错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 报告成功的验证码识别（预留方法）
   */
  reportGood() {}

  /**
   * 报告失败的验证码识别（预留方法）
   */
  reportBad() {}
}

export default GeminiSolver;

