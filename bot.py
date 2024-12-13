from telegram.ext import Updater, CommandHandler, MessageHandler, Filters
import json
import sqlite3

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scores
                 (username TEXT, score INTEGER, timestamp INTEGER)''')
    conn.commit()
    conn.close()

def save_score(username, score, timestamp):
    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute("INSERT INTO scores VALUES (?, ?, ?)", (username, score, timestamp))
    conn.commit()
    conn.close()

def get_top_scores(limit=10):
    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute("SELECT username, MAX(score) as max_score FROM scores GROUP BY username ORDER BY max_score DESC LIMIT ?", (limit,))
    results = c.fetchall()
    conn.close()
    return results

def handle_webapp_data(update, context):
    try:
        if not update.message.web_app_data:
            return
        
        data = json.loads(update.message.web_app_data.data)
        
        if data['action'] == 'newHighScore':
            user_data = data['data']
            save_score(user_data['username'], user_data['score'], user_data['timestamp'])
            update.message.reply_text(f"Новый рекорд: {user_data['score']} очков!")
            
            # Сразу отправляем таблицу лидеров
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
        print(f"Error handling webapp data: {e}")

def start(update, context):
    keyboard = {
        "inline_keyboard": [[
            {"text": "🎮 Играть", "web_app": {"url": "https://andyvoronov.github.io/SpaceBattle/"}}
        ]]
    }
    update.message.reply_text(
        'Добро пожаловать в Space Battle! Нажмите кнопку "Играть", чтобы начать.',
        reply_markup=json.dumps(keyboard)
    )

def top(update, context):
    scores = get_top_scores()
    leaderboard = "🏆 Таблица лидеров:\n\n"
    for i, (username, score) in enumerate(scores, 1):
        leaderboard += f"{i}. {username}: {score} очков\n"
    update.message.reply_text(leaderboard)

def main():
    init_db()
    updater = Updater("7893734041:AAGPXf4DRmZ--HLnN77VTPCpvC6oiyKsjWM", use_context=True)
    dp = updater.dispatcher
    
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("top", top))
    dp.add_handler(MessageHandler(Filters.web_app_data, handle_webapp_data))
    
    print("Bot started...")
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main() 