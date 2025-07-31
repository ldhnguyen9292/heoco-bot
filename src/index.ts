import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits } from 'discord.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})

const YOUR_DISCORD_BOT_TOKEN = process.env.YOUR_DISCORD_BOT_TOKEN
if (!YOUR_DISCORD_BOT_TOKEN) {
  throw new Error('YOUR_DISCORD_BOT_TOKEN is not set in .env file')
}

// Gemini API key
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in .env file')
}

// Tạo Gemini AI instance
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

client.on('messageCreate', async (message) => {
  // Bỏ qua bot
  if (message.author.bot) return

  // Kiểm tra nhắc đến bạn
  const isMentioned = message.mentions.users.find(
    (user) => user.username === 'nguyenle9292' || user.id === '1399976425221521538'
  )

  if (isMentioned) {
    const userMessage = message.content

    const prompt = `Bạn là anh trưởng nhóm, đại diện trả lời thay người dùng tên nguyenle9292. Xưng là "anh", trả lời ngắn gọn, rõ ràng, không vòng vo. Câu hỏi hoặc tin nhắn: "${userMessage}"`

    try {
      // Gửi tin nhắn đến Gemini
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Trả lời lại
      await message.reply(text)
    } catch (error) {
      console.error('Lỗi khi gọi Gemini:', error)
    }
  }
})

client.login(YOUR_DISCORD_BOT_TOKEN)
