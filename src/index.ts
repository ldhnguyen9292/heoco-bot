import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits } from 'discord.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs-extra'
import path from 'path'

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

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'chat_histories')
fs.ensureDirSync(CHAT_HISTORY_DIR)

const MAX_HISTORY_LENGTH = 50

// Load history by channel
async function loadHistory(channelId: string) {
  const filePath = path.join(CHAT_HISTORY_DIR, `${channelId}.json`)
  if (await fs.pathExists(filePath)) {
    return await fs.readJSON(filePath)
  }

  // New history with correct structure
  return []
}

interface ChatHistory {
  role: string
  parts: { text: string }[]
}

function trimHistory(history: ChatHistory[], maxLength: number): ChatHistory[] {
  // Lấy đoạn cuối sao cho đoạn đó bắt đầu bằng user
  for (let start = history.length - maxLength; start < history.length; start++) {
    if (history[start] && history[start].role === 'user') {
      return history.slice(start)
    }
  }
  // Nếu không tìm được user, trả về toàn bộ history
  return history
}

// Save history, trim to max
async function saveHistory(channelId: string, history: ChatHistory[]) {
  const trimmed = trimHistory(history, MAX_HISTORY_LENGTH)
  const filePath = path.join(CHAT_HISTORY_DIR, `${channelId}.json`)
  await fs.writeJSON(filePath, trimmed, { spaces: 2 })
}

client.on('messageCreate', async (message) => {
  // Bỏ qua bot
  if (message.author.bot) return

  // Kiểm tra nhắc đến bạn
  const isMentioned = message.mentions.users.find(
    (user) => user.username === 'nguyenle9292' || user.id === '1399976425221521538'
  )

  try {
    const channelId = message.channelId
    const prompt = message.content

    const history: ChatHistory[] = await loadHistory(channelId)
    if (!Array.isArray(history)) {
      throw new Error(`Lịch sử hội thoại không hợp lệ cho kênh ${channelId}`)
    }

    if (!isMentioned) {
      // Cập nhật lịch sử mới
      history.push({ role: 'user', parts: [{ text: prompt }] })
      await saveHistory(channelId, history)
      return
    }

    // Tạo cuộc hội thoại có sẵn lịch sử
    const chat = model.startChat({ history })

    const promptOptions = {
      responseFormat:
        "Bạn là trưởng nhóm tên Heo Cơ. Trả lời ngắn gọn, thân quen, pha chút cà khịa nhẹ. Xưng 'anh' hoặc 'khầy'. Chêm emoji, catchphrase hoặc biểu cảm quen thuộc (=)), =]], 🤣) thỉnh thoảng. Không dài dòng, giữ vibe chat nhóm bạn bè.",
      catchphrases: ['=))', '=]]', 'vl', 'kkk', '🤣']
    }

    const result = await chat.sendMessage(`prompt: ${prompt}, ${JSON.stringify(promptOptions)} `)
    let text = ''
    if ('response' in result && typeof result.response?.text === 'function') {
      text = result.response.text()
    } else if ('text' in result && typeof result.text === 'string') {
      // fallback nếu API trả thẳng chuỗi (hiếm nhưng có thể)
      text = result.text
    } else {
      throw new Error('Không thể đọc phản hồi từ Gemini')
    }

    // Cập nhật lịch sử mới
    history.push({ role: 'user', parts: [{ text: prompt }] })
    history.push({ role: 'model', parts: [{ text }] })
    await saveHistory(channelId, history)

    await message.reply(text)
  } catch (err) {
    console.error('Lỗi khi xử lý message:', err)
    await message.reply('❌ Xin lỗi, anh gặp lỗi khi xử lý tin nhắn này.')
  }
})

client.login(YOUR_DISCORD_BOT_TOKEN)
