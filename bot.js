const mineflayer = require('mineflayer');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'TeamBeastFree.aternos.me',
	port: 32660,
    username: 'AFKbot'
  });

  bot.on('login', () => {
    console.log('Bot connected!');
  });

  bot.on('spawn', () => {
    bot.chat('/login afk1234'); // if server uses /login
  });

  bot.on('end', () => {
    console.log('Disconnected. Reconnecting in 5s...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', err => console.log('Error:', err));
}

createBot();
