from flask import *
import sqlite3, json, random

makeCode = lambda: ''.join(chr(random.randint(1, 26)+64) for i in range(10)) # Ten-letter random code

app = Flask(__name__)

@app.before_request
def before_request():
    g.db = sqlite3.connect('hw4.db')

@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()

@app.route("/", methods = ('GET',))
def indexGet():
    return render_template('index.html')

@app.route("/", methods = ('POST',))
def indexPost():
    name, code, size = request.form['name'], request.form['code'], request.form['size']
    noCodeProvided = len(code.strip()) == 0
    
    if len(name.strip()) == 0:
        return render_template('error_message.html', message="Must enter name")
    
    try:
        size = int(size)
    except (ValueError, TypeError):
        if noCodeProvided:
            return render_template('error_message.html', message="Must provide code or integer size")        
        
    if noCodeProvided and not 4 <= size <= 10:
        return render_template('error_message.html', message="Size must be between 4 and 10")
    
    c = cursor()
    if noCodeProvided:
        code = makeCode()
        c.execute('INSERT INTO Game (code, players, state) VALUES (?, ?, ?)', (code, json.dumps([name]), json.dumps([[-1]*size]*size)))
        g.db.commit()
        return redirect(url_for('game', code=code, playerNum=1))
        
    result = getPlayersAndState(code)
    if result is None:
        return render_template('error_message.html', message="No game found for code " + code)
    else: 
        players, state = result
        if len(players) >= 3:
            return render_template('error_message.html', message="There are already three players in the game")
        players.append(name)
        updateGame(code, players, state)        
        return redirect(url_for('game', code=code, playerNum=len(players)))

@app.route("/game/<code>/<int:playerNum>", methods = ('GET',))
def game(code, playerNum):
    result = getPlayersAndState(code)
    if result is None:
        return render_template('error_message.html', message="No game found for code " + code)
    else:
        players, state = result
        return render_template('game.html', code=code, players=players, state=state, playerNum=playerNum)
        
@app.route("/players/<code>", methods = ('GET',))
def players(code):
    result = getPlayersAndState(code)
    if result is None:
        return json.dumps([])
    else:
        players, state = result
        return json.dumps(players)
        
@app.route("/state/<code>", methods = ('GET',))
def state(code):
    result = getPlayersAndState(code)
    if result is None:
        return json.dumps(None)
    else:
        players, state = result
        return json.dumps([[num if num != -1 else None for num in row] for row in state])
        
@app.route("/move/<code>", methods = ('POST',))
def move(code):
    row, column, playerNum = [int(i) for i in (request.form['row'], request.form['column'], request.form['playerNum'])]
    playerIndex = playerNum - 1
    
    players, state = getPlayersAndState(code)
    state[row][column] = playerIndex
    updateGame(code, players, state)
    
    return ''
        
def getPlayersAndState(code):
    c = cursor()
    c.execute('SELECT players, state FROM Game WHERE code = ?', (code,))
    result = c.fetchone()
    if result is None:
        return None
    else: 
        return (json.loads(s) for s in result)

def updateGame(code, players, state):
    cursor().execute('UPDATE Game SET players = ?, state = ? WHERE code = ?', (json.dumps(players), json.dumps(state), code))
    g.db.commit()
    
def cursor():
    c = getattr(g, 'c', None)
    if c is None:
        c = g.c = g.db.cursor()
    return c

if __name__ == "__main__":
    app.run(debug=True)
