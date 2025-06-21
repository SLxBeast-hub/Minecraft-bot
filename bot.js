const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcData = require('minecraft-data')
const Vec3 = require('vec3')

const bot = mineflayer.createBot({
  host: 'TeamBeastFree.aternos.me',
  port: 32660,
  username: 'AFKbot',
  version: false
})

bot.loadPlugin(pathfinder)

let data
let defaultMove
let protectTarget = null
let protectionInterval = null

const whitelist = ['SLxBeast', 'DST_bro']

bot.once('spawn', () => {
  bot.chat('/login afk1234')

  data = mcData(bot.version)
  defaultMove = new Movements(bot, data)
  bot.pathfinder.setMovements(defaultMove)

  bot.chat('Hello! AFKbot reporting in.')

  setInterval(killNearbyMobs, 2000)
  setInterval(checkHunger, 5000)
  setInterval(() => {
    bot.chat('Is everybody alive? 😅')
  }, 10 * 60 * 1000)

  setInterval(equipBestGear, 7000)
  setInterval(detectNearbyPlayers, 3000)
})

// ✅ Listen to chat messages with server formatting
bot.on('message', (jsonMsg) => {
  const message = jsonMsg.toString()
  console.log('Raw message from chat:', message)

  // Match messages like: <[Member]SLxBeast> @AFKbot follow Cyber_Vortexx
  const match = message.match(/^<(\[.*\])?(\w+)> @AFKbot (.+)/)
  if (!match) return

  const username = match[2] // Extract username like SLxBeast
  const commandText = match[3] // The rest after @AFKbot
  const args = commandText.split(' ')
  const command = args[0]

  switch (command) {
    case 'goto':
      if (args.length !== 4) {
        bot.chat('Usage: @AFKbot goto <x> <y> <z>')
        return
      }
      const x = parseFloat(args[1])
      const y = parseFloat(args[2])
      const z = parseFloat(args[3])
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        bot.chat('Invalid coordinates!')
        return
      }
      bot.chat(`Heading to (${x}, ${y}, ${z})`)
      bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z))
      break

    case 'follow':
      const targetName = args[1]
      const target = bot.players[targetName]?.entity
      if (!target) {
        bot.chat(`Can't find player: ${targetName}`)
        return
      }
      bot.chat(`Following ${targetName}`)
      bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true)
      break

    case 'stop':
      bot.pathfinder.setGoal(null)
      bot.chat('Stopped current movement.')
      break

    case 'status':
      const pos = bot.entity.position
      bot.chat(`📍 Pos: ${pos.floored()} | ❤️ HP: ${bot.health} | 🍗 Food: ${bot.food}`)
      break

    case 'eat':
      tryEat()
      break

    case 'protect':
      if (args[1] === 'me') {
        if (!whitelist.includes(username)) {
          bot.chat(`Sorry @${username}, you're not authorized for protection.`)
          return
        }
        const op = bot.players[username]?.entity
        if (!op) {
          bot.chat(`I can't see you, @${username}!`)
          return
        }
        protectTarget = op
        bot.chat(`🛡️ I’m here to protect you, @${username}!`)
        bot.chat(`/tp ${bot.username} ${username}`)
        bot.pathfinder.setGoal(new goals.GoalFollow(op, 1), true)
        startProtectionLoop()
      }
      break

    case 'ok':
      if (args[1] === 'now' && args[2] === 'fine' && protectTarget && username === protectTarget.username) {
        stopProtection()
        bot.chat(`✅ Standing down, @${username}.`)
      }
      break

    default:
      bot.chat('Unknown command.')
  }
})

// ⚔️ Kill Nearby Mobs
function killNearbyMobs() {
  const mob = bot.nearestEntity(entity =>
    entity.type === 'mob' &&
    entity.mobType !== 'Armor Stand' &&
    entity.mobType !== 'Villager'
  )

  if (mob && bot.health > 10) {
    bot.pathfinder.setGoal(new goals.GoalFollow(mob, 2))
    bot.attack(mob)
  }
}

// 🍗 Eat When Hungry
function checkHunger() {
  if (bot.food !== undefined && bot.food < 16) {
    tryEat()
  }
}

function tryEat() {
  const foodItem = bot.inventory.items().find(item =>
    item.name.includes('beef') || item.name.includes('bread') || item.name.includes('apple')
  )

  if (foodItem) {
    bot.equip(foodItem, 'hand', () => {
      bot.consume()
      bot.chat('Mmm… tasty!')
    })
  } else {
    bot.chat('I\'m hungry but no food in inventory 😢')
  }
}

// 🛡️ Auto Equip Armor & Sword
function equipBestGear() {
  const sword = bot.inventory.items().find(i => i.name.includes('sword'))
  if (sword) bot.equip(sword, 'hand').catch(() => {})

  const armorSlots = ['head', 'torso', 'legs', 'feet']
  const armorKeywords = ['helmet', 'chestplate', 'leggings', 'boots']

  armorSlots.forEach((slot, index) => {
    const item = bot.inventory.items().find(i => i.name.includes(armorKeywords[index]))
    if (item) bot.equip(item, slot).catch(() => {})
  })
}

// 👀 Detect Nearby Players
const seenPlayers = new Set()

function detectNearbyPlayers() {
  Object.values(bot.players).forEach(player => {
    if (player.username !== bot.username && player.entity) {
      const distance = bot.entity.position.distanceTo(player.entity.position)
      if (distance < 10 && !seenPlayers.has(player.username)) {
        bot.chat(`@${player.username} I saw you`)
        seenPlayers.add(player.username)
        setTimeout(() => seenPlayers.delete(player.username), 30 * 1000)
      }
    }
  })
}

// 🛡️ Protect Loop
function startProtectionLoop() {
  if (protectionInterval) clearInterval(protectionInterval)

  protectionInterval = setInterval(() => {
    if (!protectTarget || !protectTarget.position) return

    const nearbyHostiles = Object.values(bot.entities).filter(entity => {
      if (!entity.position || entity === protectTarget || entity === bot.entity) return false
      const distance = entity.position.distanceTo(protectTarget.position)
      return distance <= 10 && (
        (entity.type === 'mob' && entity.mobType !== 'Villager' && entity.mobType !== 'Armor Stand') ||
        (entity.type === 'player' && entity.username !== bot.username && entity.username !== protectTarget.username)
      )
    })

    if (nearbyHostiles.length > 0) {
      const target = nearbyHostiles[0]
      bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true)
      bot.attack(target)
      bot.chat(`⚔️ Defending @${protectTarget.username} from ${target.username || target.name}`)
    }
  }, 2000)
}

function stopProtection() {
  protectTarget = null
  if (protectionInterval) clearInterval(protectionInterval)
  protectionInterval = null
}

// 🔧 Error Handling
bot.on('error', console.log)
bot.on('end', () => console.log('Bot disconnected'))
