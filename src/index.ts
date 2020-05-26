
import * as React from "react"
import * as ReactDOM from "react-dom"
import Game from "./Game"
import Menu from "./Menu"

import "./styles/index.css"


type Main = () => void
const main: Main = () => {
  const mountPoint = document.createElement("div")
  mountPoint.id = "app"
  document.body.appendChild(mountPoint)
  ReactDOM.render(React.createElement(Menu), mountPoint)
}

main()
