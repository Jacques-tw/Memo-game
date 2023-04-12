const GAME_STATE = {
  FirstCardAwaits: "FirstCardAwaits",
  SecondCardAwaits: "SecondCardAwaits",
  CardsMatchFailed: "CardsMatchFailed",
  CardsMatched: "CardsMatched",
  GameFinished: "GameFinished",
}

const Symbols = [
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17989/__.png', // 黑桃
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17992/heart.png', // 愛心
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17991/diamonds.png', // 方塊
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17988/__.png' // 梅花
]

// 當物件的屬性與函式/變數名稱相同時，可以省略不寫
const view = {
  getCardContent(index) {
    // 負責生成卡片內容，包括花色和數字
    // 玩家點擊時，才由翻牌函式呼叫
    const number = this.transformNumber((index % 13) + 1)//餘數+1，決定數字
    const symbol = Symbols[Math.floor(index / 13)] //只取整數
    return `
      <div class="card">
        <p>${number}</p>
        <img src="${symbol}" />
        <p>${number}</p>
      </div>`
  },
  getCardElement(index) {
    // 改成渲染牌背元件
    // 遊戲初始化時為牌背朝上
    return `
      <div data-index="${index}" class="card back"></div>`
  },
  transformNumber(number) {
    switch (number) {
      case 1:
        return 'A'
      case 11:
        return 'J'
      case 12:
        return 'Q'
      case 13:
        return 'K'
      default:
        return number
    }
  },
  displayCards(indexes) {
    // 負責選出'#cards'並抽換內容
    const rootElement = document.querySelector('#cards')
    //用map()迭代陣列，丟進getCardElement()之後，產生52張卡片的陣列
    //再用join()將陣列合併成大字串，以丟進template literal使用
    rootElement.innerHTML = indexes.map(index => this.getCardElement(index)).join("")
  },
  flipCards(...cards) {
    cards.map(card => {
      // 點擊牌背朝上的卡=> 回傳牌面內容(數字、花色)
      if (card.classList.contains('back')) {
        card.classList.remove('back')
        card.innerHTML = this.getCardContent(Number(card.dataset.index))
        return
      }
      // 點擊牌面朝上的卡=> 清除牌面內容、重新呼叫牌背(css樣式)
      card.classList.add('back')
      card.innerHTML = null
    })
  },
  pairedCards(...cards) {
    cards.map(card => {
      card.classList.add('paired')
    })
  },
  renderScore(score) {
    document.querySelector('.score').textContent = `Score: ${score}`
  },
  renderTriedTimes(times) {
    document.querySelector('.tried').textContent = `You've tried ${times} times`
  },
  appendWrongAnimation(...cards) {
    cards.forEach(card => {
      card.classList.add('wrong')
      card.addEventListener('animationend', event => event.target.classList.remove('wrong'), { once: true })
      // 一旦動畫結束(animationend)，就將監聽器卸載；每次需動態綁上、用完卸載({once:true})
    })
  },
  showGameFinished() {
    const div = document.createElement('div')
    div.classList.add('completed')
    div.innerHTML = `
      <p>Complete!</p>
      <p>Score: ${model.score}</p>
      <p>You've tried: ${model.triedTimes} times</p>`
    const header = document.querySelector('#header')
    header.before(div)
  }
}

const utility = {
  getRandomNumberArray(count) {
    const number = Array.from(Array(count).keys())//產出有52項的陣列,i.e.[0,1,2...51]
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1)) //隨機產出0~51的數字
        ;[number[index], number[randomIndex]] = [number[randomIndex], number[index]] //交換陣列元素；此處分號不可省略，以區分上方列的Math.floor和這列的解構賦值
    }
    return number
  }
}

const controller = {
  // 目的：依遊戲狀態來分配動作
  currentState: GAME_STATE.FirstCardAwaits, //還沒翻牌

  // 由 controller 啟動遊戲初始化
  // 由 controller 來呼叫 utility.getRandomNumberArray，避免 view 和 utility產生耦合
  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52))
  },

  // 遊戲中樞：在「使用者點擊卡片」以後，依照當下的遊戲狀態，發派工作給 view 和 controller
  dispatchCardAction(card) {
    if (!card.classList.contains('back')) {
      return
    } //防呆：已經翻過來的牌就不要有動作
    switch (this.currentState) {
      case GAME_STATE.FirstCardAwaits:
        view.flipCards(card)
        model.revealedCards.push(card)
        this.currentState = GAME_STATE.SecondCardAwaits
        break
      case GAME_STATE.SecondCardAwaits:
        view.renderTriedTimes(++model.triedTimes)
        view.flipCards(card)
        model.revealedCards.push(card)
        // 判斷是否成功配對
        if (model.isRevealedCardsMatched()) {
          //配對成功
          view.renderScore(model.score += 10)
          this.currentState = GAME_STATE.CardsMatched
          view.pairedCards(...model.revealedCards)
          model.revealedCards = []
          if (model.score === 260) { // 若全部翻完則跳出完賽通知
            this.currentState = GAME_STATE.GameFinished
            view.showGameFinished()
            return
          }
          this.currentState = GAME_STATE.FirstCardAwaits
        } else {
          //配對失敗
          this.currentState = GAME_STATE.CardsMatchFailed
          view.appendWrongAnimation(...model.revealedCards)
          setTimeout(this.resetCards, 1000)
        }
        break
    }
    console.log("current state: ", this.currentState)
    console.log("revealed cards: ", model.revealedCards.map(card => card.dataset.index))
  },
  resetCards() {
    view.flipCards(...model.revealedCards)
    model.revealedCards = []
    controller.currentState = GAME_STATE.FirstCardAwaits
    // 原本的 this 在搬進 resetCards 之後，要改成 controller
    // 否則 resetCards 會指向 setTimeout
  }
}

const model = {
  revealedCards: [], //暫存牌組：每次翻牌丟進來，集滿兩張需檢查是否配對成功，再清除

  isRevealedCardsMatched() {
    return this.revealedCards[0].dataset.index % 13 === this.revealedCards[1].dataset.index % 13
  },

  score: 0,
  triedTimes: 0
}

// MVC架構下，不要讓 controller 以外的內部函式暴露在 global 的區域
controller.generateCards()

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', e => {
    controller.dispatchCardAction(card)
  })
})