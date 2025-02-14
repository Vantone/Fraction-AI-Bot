import axios from "axios";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import Tools from "../utils/tools.js";
import Display from "../utils/display.js";

class Client {
  constructor() {
    this.baseUrl = "https://dapp-backend-4x.fractionai.xyz/api3";
    this.userAgent = Tools.getRandomUA();

    this.proxies = this.loadProxies();
    this.proxyIndex = 0;
    // Initialize axiosInstance with a proxy
    this.axiosInstance = this.createAxiosInstance(this.currentProxy);

    this.maxRetries = 5; // 🔥 Maximum retry attempts before stopping
    this.retryDelay = 5000; // 🔥 Wait 5 seconds before retrying

    this.updateProxy();
  }

  // 📌 Load proxy list from proxies.txt
  loadProxies() {
    try {
      const proxies = fs.readFileSync("proxies.txt", "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("http"));

      if (proxies.length === 0) {
        console.log("❌ No valid proxies found! Exiting...");
        process.exit(1);
      }

      return proxies;
    } catch (error) {
      console.error("❌ Error reading proxies.txt:", error.message);
      process.exit(1);
    }
  }

  // 📌 Get the next proxy from the list (rotating)
  getNextProxy() {
    if (!this.proxies.length) {
      console.log("⚠️ Proxy list is empty!");
      return null;
    }

    const proxy = this.proxies[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  // 📌 Create axios instance with proxy support
  createAxiosInstance(proxyUrl) {
    if (!proxyUrl) return axios.create({ timeout: 30000 });

    const isHttp = proxyUrl.startsWith("http://");
    const agent = isHttp ? new HttpProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);

    return axios.create({
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
      proxy: false,
      httpAgent: isHttp ? agent : undefined,
      httpsAgent: !isHttp ? agent : undefined,
    });
  }

  // 📌 Update to the next proxy
  async updateProxy() {
    this.currentProxy = this.getNextProxy();
    this.axiosInstance = this.createAxiosInstance(this.currentProxy);
  }

  // 📌 Retrieve the current proxy's IP address
  async getCurrentIP() {
    try {
      const response = await this.axiosInstance.get("http://api64.ipify.org?format=json");
      Display.log(`Using Proxy: ${response.data?.ip || "Unknown"}`);
      return response.data?.ip || "Unknown";
    } catch (error) {
      console.log("⚠️ Failed to fetch proxy IP:", error.message);
      return "Unknown";
    }
  }

  // 📌 Fetch API request with proxy rotation and retry mechanism
  async fetch(endpoint, method = "GET", token, body = {}, attempt = 0) {
    try {
      if (attempt >= this.maxRetries) {
        return { status: 429, data: null };
      }

      const url = this.baseUrl + endpoint;
      const headers = await this.createHeaders(token);

      const response = await this.axiosInstance({
        method,
        url,
        headers,
        data: method !== "GET" ? body : undefined,
      });

      return { status: response.status, data: response.data };
    } catch (error) {
      this.updateProxy(); // ✅ Always switch to a new proxy before retrying

      if (error.response?.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay)); // 🔥 Wait before retrying
      }

      return this.fetch(endpoint, method, token, body, attempt + 1);
    }
  }

  // 📌 Create request headers
  async createHeaders(token) {
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Allowed-State": "na",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // 📌 Retrieve a nonce from the API
  async getNonce() {
    try {
      const response = await this.axiosInstance("/auth/nonce");
      if (!response.data?.nonce) throw new Error("Invalid nonce response");
      return response.data.nonce;
    } catch (error) {
      throw new Error(`Failed to get nonce: ${error.message}`);
    }
  }
}

export default Client;
