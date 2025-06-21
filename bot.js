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

let defaultMove

bot.once('spawn', async () => {
  bot.chat('/login afk1234')
  const data = mcData(bot.version)
  defaultMove = new Movements(bot, data)

  defaultMove.canDig = true
  defaultMove.allow1by1towers = true

  // Allow building blocks
  defaultMove.scafoldingBlocks = bot.inventory.items().filter(item =>
    item.name.includes('dirt') || item.name.includes('stone') || item.name.includes('cobblestone')
  )

  bot.pathfinder.setMovements(defaultMove)

  bot.chat('I’m online and will hunt players no matter where they hide! 😈')

  setInterval(trackAndAttackPlayers, 3000)
})

async function equipGear() {
  const sword = bot.inventory.items().find(i => i.name.includes('sword'))
  if (sword) await bot.equip(sword, 'hand').catch(() => {})

  const shield = bot.inventory.items().find(i => i.name.includes('shield'))
  if (shield) await bot.equip(shield, 'off-hand').catch(() => {})

  const armorSlots = ['head', 'torso', 'legs', 'feet']
  const armorKeywords = ['helmet', 'chestplate', 'leggings', 'boots']
  for (let i = 0; i < armorSlots.length; i++) {
    const item = bot.inventory.items().find(it => it.name.includes(armorKeywords[i]))
    if (item) await bot.equip(item, armorSlots[i]).catch(() => {})
  }
}

async function trackAndAttackPlayers() {
  await equipGear()

  const target = Object.values(bot.players)
    .map(p => p.entity)
    .filter(p => p && p.type === 'player' && p.username !== bot.username)
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))[0]

  if (!target) return

  bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true)

  // Attack if close enough
  if (bot.entity.position.distanceTo(target.position) < 3) {
    bot.lookAt(target.position.offset(0, target.height, 0), true)
    bot.attack(target)
  } else {
    // Break blocks if needed
    tryBreakBlockInWay(target)
  }
}

async function tryBreakBlockInWay(target) {
  const blockInFront = bot.blockAt(bot.entity.position.offset(0, -1, 0))
  const targetBelow = bot.blockAt(target.position.offset(0, 0, 0))

  const pickaxe = bot.inventory.items().find(i => i.name.includes('pickaxe'))
  if (pickaxe) {
    await bot.equip(pickaxe, 'hand').catch(() => {})
  }

  if (blockInFront && bot.canDigBlock(blockInFront)) {
    try {
      await bot.dig(blockInFront)
    } catch {}
  }

  if (targetBelow && bot.canDigBlock(targetBelow)) {
    try {
      await bot.dig(targetBelow)
    } catch {}
  }
}

bot.on('entityDead', (entity) => {
  if (entity.type === 'player') {
    bot.chat(`You are so weak, asshole ${entity.username}!`)
  }
})

bot.on('error', console.log)
bot.on('end', () => console.log('Bot disconnected'))
