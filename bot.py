from telegram.ext import Updater, CommandHandler, MessageHandler, Filters
import json
import sqlite3
import logging

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def init_db():
    try:
        conn = sqlite3.connect('scores.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS scores
                     (username TEXT, score INTEGER, timestamp INTEGER)''')
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

def save_score(username, score, timestamp):
    try:
        conn = sqlite3.connect('scores.db')
        c = conn.cursor()
        c.execute("INSERT INTO scores VALUES (?, ?, ?)", (username, score, timestamp))
        conn.commit()
        conn.close()
        logger.info(f"Score saved for {username}: {score}")
    except Exception as e:
        logger.error(f"Error saving score: {e}")

def get_top_scores(limit=10):
    try:
        conn = sqlite3.connect('scores.db')
        c = conn.cursor()
        c.execute("SELECT username, MAX(score) as max_score FROM scores GROUP BY username ORDER BY max_score DESC LIMIT ?", (limit,))
        results = c.fetchall()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Error getting top scores: {e}")
        return []

def start(update, context):
    try:
        keyboard = {
            "inline_keyboard": [[
                {"text": "🎮 Играть", "web_app": {"url": "https://t.me/SpaceBattleRussianBot/SpaceBattleApp"}}
            ]]
        }
        update.message.reply_text(
            'Добро пожаловать в Space Battle! Нажмите кнопку "Играть", чтобы начать.',
            reply_markup=json.dumps(keyboard)
        )
        logger.info(f"Start command used by {update.effective_user.username}")
    except Exception as e:
        logger.error(f"Error in start command: {e}")

def top(update, context):
    try:
        scores = get_top_scores()
        if not scores:
            update.message.reply_text("Пока нет результатов! Сыграйте первым! 🎮")
            return
            
        leaderboard = "🏆 Таблица лидеров:\n\n"
        for i, (username, score) in enumerate(scores, 1):
            leaderboard += f"{i}. {username}: {score} очков\n"
        update.message.reply_text(leaderboard)
        logger.info(f"Top command used by {update.effective_user.username}")
    except Exception as e:
        logger.error(f"Error in top command: {e}")

def handle_webapp_data(update, context):
    try:
        if not update.message.web_app_data:
            return
            
        data = json.loads(update.message.web_app_data.data)
        logger.info(f"Received webapp data: {data}")
        
        if data['action'] == 'newHighScore':
            user_data = data['data']
            save_score(user_data['username'], user_data['score'], user_data['timestamp'])
            update.message.reply_text(f"Новый рекорд: {user_data['score']} очков!")
            
            scores = get_top_scores()
            leaderboard = "🏆 Таблица лидеров:\n\n"
            for i, (username, score) in enumerate(scores, 1):
                leaderboard += f"{i}. {username}: {score} очков\n"
            update.message.reply_text(leaderboard)
            
        elif data['action'] == 'getLeaderboard':
            scores = get_top_scores()
            leaderboard = "🏆 Таблица лидеров:\n\n"
            for i, (username, score) in enumerate(scores, 1):
                leaderboard += f"{i}. {username}: {score} очков\n"
            update.message.reply_text(leaderboard)
            update.message.reply_text("Нажмите 'Играть заново' чтобы попробовать еще раз!")
    except Exception as e:
        logger.error(f"Error handling webapp data: {e}")

def error_handler(update, context):
    logger.error(f"Update {update} caused error {context.error}")

def main():
    try:
        init_db()
        TOKEN = "7893734041:AAGPXf4DRmZ--HLnN77VTPCpvC6oiyKsjWM"
        updater = Updater(TOKEN, use_context=True)
        dp = updater.dispatcher
        
        dp.add_handler(CommandHandler("start", start))
        dp.add_handler(CommandHandler("top", top))
        dp.add_handler(MessageHandler(Filters.web_app_data, handle_webapp_data))
        dp.add_error_handler(error_handler)
        
        logger.info("Bot started...")
        logger.info(f"Bot username: @{updater.bot.username}")
        
        updater.start_polling()
        updater.idle()
    except Exception as e:
        logger.error(f"Critical error in main: {e}")

if __name__ == '__main__':
    main() 