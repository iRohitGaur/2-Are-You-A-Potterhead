var rs = require("readline-sync")
let chalk = require('chalk')
var firebase = require('firebase')

let green = chalk.bold.green
let red = chalk.bold.red
let cyan = chalk.bold.cyan
let yellow = chalk.bold.yellow

let log = console.log

// Firebase configuration - this should not be public.
// Please use your own config if you intend to use this code.
var firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
}
// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get a reference to the database service
let database = firebase.database()
let quizRef = database.ref("quiz")

var scoreboard = []
var quiz = []

var level = 0
var score = 0

// arrays to carry questions with relevant points
var points10 = []
var points20 = []
var points30 = []
var points40 = []
var points50 = []

console.log(cyan("Welcome to the game:"), yellow("Are You A Real Potterhead?"))

// Get the name of the user
let name = rs.question("\nEnter your name: ")

console.log(green(`Hello ${name}!`))

begin()

function begin() {
  (async function () {
    // Read Quiz data from firebase
    quizRef.once('value').then(function(snapshot) {
      quiz = snapshot.val()
      
      // filter the questions based on the points
      points10 = quiz.filter( q => q.points == 10 )
      points20 = quiz.filter( q => q.points == 20 )
      points30 = quiz.filter( q => q.points == 30 )
      points40 = quiz.filter( q => q.points == 40 )
      points50 = quiz.filter( q => q.points == 50 )

      // Game description
      log(cyan("\nGame Description:"))
      log(yellow("There are 5 categories and every category has points:"))
      log(red("50, 40, 30, 20 and 10 points\n"))
      log(yellow("Level 1: 2 questions from all categories. Total 10 questions and 300 points."))
      log(red("Level 2: 4 questions from all categories. Total 20 questions and 600 points."))
      log(yellow("Level 3: 6 questions from all categories. Total 30 questions and 900 points."))
      log(red("Level 4: 8 questions from all categories. Total 40 questions and 1200 points."))
      log(yellow("Level 5: 10 questions from all categories. Total 50 questions and 1500 points."))

      log(green("\nRight answer will get you full points of the question.\nWrong answer will deduct half points of the question from your score"))

      log("\nExample: Enter 1 for level 1")
      level = selectLevel()
      log("You selected: Level", level)

      // Read Scoreboard data from firebase
      database.ref(`scoreboard${level}`).once('value').then(function(snapshot) {
        scoreboard = snapshot.val()
        scoreboard.sort(function(a, b) {
          return b.score - a.score;
        })
        // Display scoreboard data
        displayScoreboard()
        // Start game
        startGame(parseInt(level)*2)
      })
    })
  })()
}

// Gets and returns user input from 1 to 5
function selectLevel() {
  let selectedLevel = rs.question("Select a level: ")
  if (selectedLevel == "1" || selectedLevel == "2" || selectedLevel == "3" || selectedLevel == "4" || selectedLevel == "5") {
    return selectedLevel
  } else {
    log(red("You can only enter 1 to 5\n"))
    return selectLevel()
  }
}

// Logs the Scoreboard
function displayScoreboard() {
  log(yellow("\nCurrent Scoreboard:"))
  for(player of scoreboard) {
    log(green(`Name: ${player.name}. Highscore: ${player.score}`))
  }
}

/**
 * Starts the game with the limit based on the selected level
 * For level 1, limit is 2 questions per category
 * For level 2, limit is 4 questions per category
 * For level 3, limit is 6 questions per category
 * For level 4, limit is 8 questions per category
 * For level 5, limit is 10 questions per category
 */
function startGame(limit) {
  // Extract the number of questions from each category based on the limit
  var questionList = points10.sort(() => .5 - Math.random()).slice(0, limit)
  questionList = questionList.concat(points20.sort(() => .5 - Math.random()).slice(0, limit))
  questionList = questionList.concat(points30.sort(() => .5 - Math.random()).slice(0, limit))
  questionList = questionList.concat(points40.sort(() => .5 - Math.random()).slice(0, limit))
  questionList = questionList.concat(points50.sort(() => .5 - Math.random()).slice(0, limit))

  // Randomize the questions
  questionList = questionList.sort(() => .5 - Math.random()).slice(0, questionList.length)

  // Process all questions one by one
  for ([i, q] of questionList.entries()) {
    let isCorrect = askQuestion(i+1, q.points, q.question, q.answer1, q.answer2)
    if (isCorrect) {
      // Intimate user if his answer is correct
      log(`Your answer is ${green(isCorrect)}.\nCurrent score: ${green(score)}`)
    } else {
      // Intimate user if his answer is incorrect
      log(`Your answer is ${red(isCorrect)}.\nCorrect answer: '${green(q.answer1)}'.\nOther acceptable answer: '${green(q.answer2)}'.\nCurrent score: ${red(score)}`)
    }
  }

  // Compare the current score with existing one to check if there is a highscore
  compareCurrentScore()
}

// asks a question to the user and returns true or false
function askQuestion(quesNum, points, ques, correctAnswer1, correctAnswer2) {
  var ans = rs.question(`\nQuestion Number: ${yellow(quesNum)}\nPoints: ${yellow(points)}\n${yellow(ques)} `)
  if (ans.toLowerCase() === correctAnswer1.toLowerCase() || ans.toLowerCase() === correctAnswer2.toLowerCase()) {
    score += parseInt(points)
    return true
  } else {
    score -= (parseInt(points)/2)
    return false
  }
}

// Compares the current score with existing one to check if there is a highscore and calls updateScoreboard() to update the score if we do have a highscore
function compareCurrentScore() {
  if (score > scoreboard[2].score) {
    log(green("\nNew Highscore!"))
    let newScore = {"name":name, "score":score}
    scoreboard.pop()
    scoreboard.push(newScore)
    scoreboard.sort(function(a, b) {
      return b.score - a.score;
    })
    updateScoreboard()
  } else {
    log(red("\nYou couldn't beat the highscore. Better luck next time!"))

    displayScoreboard()
  }
}

// Updates the current score to the Scoreboard in firebase
function updateScoreboard() {
  database.ref(`scoreboard${level}`).set(scoreboard, function(error) {
    if (error) {
      // The write failed...
      log("Failed with error: " + error)
    } else {
      // Congratulate user
      log(green("\nCongratulations! Your name has been added to the Potterhead Scoreboard"))
      
      // Display new Scoreboard
      displayScoreboard()
    }
  })
}