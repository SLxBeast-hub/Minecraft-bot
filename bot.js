const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcData = require('minecraft-data')

const bot = mineflayer.createBot({
  host: 'TeamBeastFree.aternos.me',
  port: 32660,
  username: 'AFKbot',
  version: false
})

bot.loadPlugin(pathfinder)

let data, defaultMove

bot.once('spawn', async () => {
  bot.chat('/login afk1234')

  data = mcData(bot.version)
  defaultMove = new Movements(bot, data)
  bot.pathfinder.setMovements(defaultMove)

  await equipBestGear()
  bot.chat('Hello! Berserk mode activated!')

  // Attack loop every 1 second
  setInterval(() => {
    attackNearbyEntities()
  }, 1000)

  // Check hunger and health every 5 seconds (no chat feedback)
  setInterval(() => {
    checkHealthAndHunger()
  }, 5000)
})

// Equip sword, shield, armor
async function equipBestGear() {
  try {
    const sword = bot.inventory.items().find(i => i.name.includes('sword'))
    if (sword) await bot.equip(sword, 'hand')

    const shield = bot.inventory.items().find(i => i.name.includes('shield'))
    if (shield) await bot.equip(shield, 'off-hand')

    const armorSlots = ['head', 'torso', 'legs', 'feet']
    const armorKeywords = ['helmet', 'chestplate', 'leggings', 'boots']
    for (let i = 0; i < armorSlots.length; i++) {
      const item = bot.inventory.items().find(it => it.name.includes(armorKeywords[i]))
      if (item) await bot.equip(item, armorSlots[i])
    }
  } catch (err) {
    console.log('Equip error:', err)
  }
}

// Attack any hostile or player within 10 blocks
function attackNearbyEntities() {
  const nearbyTargets = Object.values(bot.entities).filter(entity => {
    if (!entity.position || entity === bot.entity) return false
    const dist = entity.position.distanceTo(bot.entity.position)
    if (dist > 10) return false

    if (entity.type === 'player' && entity.username !== bot.username) return true
    if (entity.type === 'mob') return true

    return false
  })

  if (nearbyTargets.length === 0) {
    bot.pathfinder.setGoal(null)
    return
  }

  nearbyTargets.sort((a, b) =>
    a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position)
  )
  const target = nearbyTargets[0]

  bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true)
  bot.lookAt(target.position.offset(0, target.height, 0), true)
  if (!bot.isAttacking) {
    bot.attack(target)
  }
}

// Check health and hunger, eat golden apple if possible, else normal food (no chat)
async function checkHealthAndHunger() {
  if (bot.food === undefined || bot.health === undefined) return

  const lowFood = bot.food < 16
  const lowHealth = bot.health < 12

  if (lowFood || lowHealth) {
    // Try golden apple first
    const goldenApple = bot.inventory.items().find(i => i.name.includes('golden_apple'))
    if (goldenApple) {
      try {
        await bot.equip(goldenApple, 'hand')
        await bot.consume()
        return
      } catch {
        // fallback to normal food
      }
    }

    // Fallback normal food
    const foodItem = bot.inventory.items().find(i =>
      ['beef', 'bread', 'apple'].some(f => i.name.includes(f))
    )
    if (foodItem) {
      try {
        await bot.equip(foodItem, 'hand')
        await bot.consume()
      } catch {
        // ignore errors here
      }
    }
  }
}

// Keep equipping gear every tick
bot.on('physicTick', () => {
  equipBestGear().catch(() => {})
})

// Chat feedback when bot kills a player
bot.on('entityDead', (entity) => {
  if (entity.type === 'player') {
    bot.chat(`You are so weak, asshole ${entity.username}!`)
  }
})

bot.on('error', console.log)
bot.on('end', () => console.log('Bot disconnected'))
