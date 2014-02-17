var PLAYERS = null;

var allowMove = false;

function show(id) {
    $('#' + id).css('display', '');

    // Special things happen when showing the game status message.
    if (id == "not_your_turn") {
        $("#game-info-panel").addClass("panel-default");
        hide("game_info_title");
    }
    else if (id == "your_turn") {
        $("#game-info-panel").addClass("panel-success");
        hide("game_info_title");
    }
    else if (id == "game_not_yet_begun") {
        $("#game-info-panel").addClass("panel-warning");
        hide("game_info_title");
    }
    else if (id == "game_complete") {
        $("#game-info-panel").addClass("panel-info");
        hide("game_info_title");
    }
    else if (id == "game_info_title") {
        $("#game-info-panel").addClass("panel-default");
    }
}

function hide(id) {
    $('#' + id).css('display', 'none');

    // Special things happen when hiding the game status message.
    if (id == "not_your_turn") {
        $("#game-info-panel").removeClass("panel-default");
        show("game_info_title");
    }
    else if (id == "your_turn") {
        $("#game-info-panel").removeClass("panel-success");
        show("game_info_title");
    }
    else if (id == "game_not_yet_begun") {
        $("#game-info-panel").removeClass("panel-warning");
        show("game_info_title");
    }
    else if (id == "game_complete") {
        $("#game-info-panel").removeClass("panel-info");
        show("game_info_title");
    }
    else if (id == "game_info_title") {
        $("#game-info-panel").addClass("panel-default");
    }
}

function checkAllPlayersPresent() {
    $.get('/players/' + GAME_CODE, null, function(players) {
        PLAYERS = players;

        // Update player list
        $('#playerList').html('');
        for (var i = 0; i < players.length; i++) {
            if ((i+1) == PLAYER_NUM)
                $('#playerList').append('<li class="list-group-item text-info">' + (i+1) + ".&emsp;" + players[i] + '</li>');
            else
                $('#playerList').append('<li class="list-group-item">' + (i+1) + ".&emsp;" + players[i] + '</li>');
        }

        if (players.length < 3) {
            setTimeout(checkAllPlayersPresent, 1000);
        } else {
            hide('game_not_yet_begun');
            show('not_your_turn');
            if (PLAYER_NUM == 1)
                alert('Everyone has arrived, time to play! You are Player ' + PLAYER_NUM + ' and it\'s your turn!');
            else
                alert('Everyone has arrived, time to play! You are Player ' + PLAYER_NUM + '!');
            checkState();
        }
    }, 'json');
};

var MARK_SYMBOLS = {0: 'X', 1: 'O', 2: 'Z'};
function updateBoard(state) {
    for (var r = 0; r < state.length; r++) {
        var row = state[r];
        for (var c = 0; c < row.length; c++) {
            var mark = row[c];
            if (mark === "&ensp;") continue;

            var button = $('td[data-row=' + r + '][data-column=' + c + ']');
            if (button.length === 0) continue;

            button.html(MARK_SYMBOLS[mark]);
        }
    }
}

function isGameOver(state) {
    for (var r = 0; r < state.length; r++) {
        for (var c = 0; c < state[r].length; c++) {
            if (state[r][c] === null) return false;
        }
    }
    return true;
}

function isUserCurrentPlayer(state) {
    var moveCount = 0;
    for (var r = 0; r < state.length; r++) {
        var row = state[r];
        for (var c = 0; c < row.length; c++) {
            var mark = row[c];
            if (mark !== null) moveCount++;
        }
    }
    return moveCount % 3 + 1 == PLAYER_NUM;
}

function getScores(state) {
    // Scores start at zero
    var scores = {};
    for (var i = 0; i < PLAYERS.length; i++) {
        scores[i] = 0;
    }

    // Scoring helpers
    var currMark, markCount;

    function beforeLoop() {
        currMark = -1;
        markCount = 0;
    }

    function inLoopUpdateScore(r, c) {
        var mark = state[r][c];
        if (mark !== currMark) {
            if (currMark !== -1 && markCount > 1) scores[currMark] += Math.pow(2, markCount - 1);
            currMark = mark;
            markCount = 1;
        } else {
            markCount++;
        }
    }

    function afterLoopUpdateScore() {
        if (currMark !== -1 && markCount > 1) scores[currMark] += Math.pow(2, markCount - 1);
        currMark = -1;
        markCount = 0;
    }

    // Left-to-right
    beforeLoop();
    for (var r = 0; r < state.length; r++) {
        for (var c = 0; c < state[r].length; c++) {
            inLoopUpdateScore(r, c);
        }
        afterLoopUpdateScore();
    }

    // Top-to-bottom
    beforeLoop();
    for (var c = 0; c < state[0].length; c++) {
        for (var r = 0; r < state.length; r++) {
            inLoopUpdateScore(r, c);
        }
        afterLoopUpdateScore();
    }

    // SW-NE
    beforeLoop();
    var largestIndexSum = (state.length - 1) + (state[0].length - 1);
    for (var lineIndexSum = 0; lineIndexSum <= largestIndexSum; lineIndexSum++) {
        for (var r = lineIndexSum; r >= 0; r--) {
            if (r >= state.length) continue;
            var row = state[r];

            var c = lineIndexSum - r;
            if (c >= row.length) continue;

            inLoopUpdateScore(r, c);                
        }
        afterLoopUpdateScore();
    }

    // NW-SE (part 1)
    beforeLoop();
    for (var rStart = state.length - 1; rStart > 0; rStart--) {
        var r = rStart;
        var c = 0;
        while (r < state.length && c < state[r].length) {
            inLoopUpdateScore(r++, c++);
        }
        afterLoopUpdateScore();
    }

    // NW-SE (part 2)
    beforeLoop();
    for (var cStart = 0; cStart < state[0].length; cStart++) {
        var c = cStart;
        var r = 0;                    
        while (r < state.length && c < state[r].length) {
            inLoopUpdateScore(r++, c++);
        }
        afterLoopUpdateScore();
    }

    return scores;
}

function showScores(state) {
	scores = getScores(state);

    $('#playerList').html('');
    for (var i = 0; i < PLAYERS.length; i++) {
        if ((i+1) == PLAYER_NUM)
            $('#playerList').append('<li class="list-group-item text-info">' + (i+1) + ".&emsp;" + PLAYERS[i]  + '<span class="badge">' + scores[i] + '</span></li>');
        else
            $('#playerList').append('<li class="list-group-item">' + (i+1) + ".&emsp;" + PLAYERS[i]  + '<span class="badge">' + scores[i] + '</span></li>');
    }
}

function checkState() {
    $.get('/state/' + GAME_CODE, null, function(state) {
        updateBoard(state);
        if (isGameOver(state)) {
        	hide('not_your_turn');
            show('game_complete');
		} else if (isUserCurrentPlayer(state)) {
			hide('not_your_turn');
			show('your_turn');
			allowMove = true;
        } else {
			setTimeout(checkState, 1000);
        }
        showScores(state);
    }, 'json');
}
            
$(function() {
    $('.board-space').click(function() {
        if (!allowMove) return;

        var button = $(this);
        var row = button.attr('data-row');
        var column = button.attr('data-column');

        $.post('/move/' + GAME_CODE, {'row': row, 'column': column, 'playerNum': PLAYER_NUM}, function() {
            hide('your_turn');
            show('not_your_turn');
            allowMove = false;
            checkState();
        });
    });

    checkAllPlayersPresent();
});