import * as React from "react"
import styled from "styled-components"

import Game from "./Game"


interface ShellProps {
  active: boolean
}
const Shell = styled.div`
  display: ${(p: ShellProps) => p.active ? "flex" : "none"};
  flex-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0,0,0,0.5);
  font-family: sans-serif;
  font-size: 32px;

  > *:not(:last-child) {
    margin-top: 1em;
  }
`

const Modal = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  > * {
    margin-bottom: 16px;
  }
`

const Title = styled.header`
  font-size: 64px;
  text-shadow: 0 0 3px white;
  background-color: 
`

const EntriesWrapper = styled.div`
`

const Entry = styled.button`
  width: 100%;
  padding: 8px 16px;
  font-size: 24px;
  font-weight: bold;
`

type component = React.FunctionComponent
const component: component = (props) => {
  const [shouldShowMenu, setShowMenu] = React.useState(true)
  const showMenu = () => setShowMenu(true)
  const hideMenu = () => setShowMenu(false)

  return (
    <>
      <Game paused={shouldShowMenu} showMenu={showMenu} />
      <Shell active={shouldShowMenu}>
        <Modal>
          <Title>Game</Title>
          <EntriesWrapper>
            <Entry onClick={hideMenu}>Resume</Entry>
          </EntriesWrapper>
        </Modal>
      </Shell>
    </>
  )
}

export default component
