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

bot.on('spawn', () => {
  const data = mcData(bot.version)
  const defaultMove = new Movements(bot, data)
  bot.pathfinder.setMovements(defaultMove)

  bot.chat('Hello! AFKbot reporting in.')

  // Start mob killing loop
  setInterval(killNearbyMobs, 2000)

  // Start hunger check
  setInterval(checkHunger, 5000)

  // Every 10 minutes — chat "Is everybody alive? 😅"
  setInterval(() => {
    bot.chat('Is everybody alive? 😅')
  }, 10 * 60 * 1000)
})

// Chat Commands
bot.on('chat', (username, message) => {
  if (username === bot.username) return

  if (message.startsWith('@AFKbot')) {
    const args = message.split(' ')
    const command = args[1]

    if (command === 'goto') {
      if (args.length !== 5) {
        bot.chat('Usage: @AFKbot goto <x> <y> <z>')
        return
      }
      const x = parseFloat(args[2])
      const y = parseFloat(args[3])
      const z = parseFloat(args[4])

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        bot.chat('Invalid coordinates!')
        return
      }

      bot.chat(`Okay, I'm going to (${x}, ${y}, ${z})`)
      const goal = new goals.GoalBlock(x, y, z)
      bot.pathfinder.setGoal(goal)
    }
  }
})

// Kill Nearby Mobs
function killNearbyMobs() {
  const mob = bot.nearestEntity(entity =>
    entity.type === 'mob' && entity.mobType !== 'Armor Stand' && entity.mobType !== 'Villager'
  )

  if (mob) {
    bot.pathfinder.setGoal(new goals.GoalFollow(mob, 2))
    bot.attack(mob)
  }
}

// Eat When Hungry
function checkHunger() {
  if (bot.food !== undefined && bot.food < 16) { // 16/20 is 80%
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
}

// Optional: Viewer (watch bot live!)
//const viewer = require('prismarine-viewer').mineflayer
//bot.once('spawn', () => {
//  viewer(bot, { port: 3007, firstPerson: true })
//})

bot.on('error', console.log)
bot.on('end', () => console.log('Bot disconnected'))