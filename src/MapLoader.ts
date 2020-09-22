export const enum TileType {
  TopGround = "G",
  Ground = "g",
  DeepGround = "r",
  Concrete = "C",
  MovingPlatform = "m",
  StrongLight = "L",
  WeakLight = "l",
  Player = "P",
  Monster = "M",
}

export interface Tile {
  type: TileType
  x: number
  y: number
}

const Tile = (type: TileType, x: number, y: number) => ({ type, x, y })

const charToType = (text: string, pos: number) => {
  switch (text[pos]) {
    case TileType.TopGround: return TileType.TopGround
    case TileType.Ground: return TileType.Ground
    case TileType.DeepGround: return TileType.DeepGround
    case TileType.Concrete: return TileType.Concrete
    case TileType.MovingPlatform: return TileType.MovingPlatform
    case TileType.StrongLight: return TileType.StrongLight
    case TileType.WeakLight: return TileType.WeakLight
    case TileType.Player: return TileType.Player
    case TileType.Monster: return TileType.Monster
    default:
      return new Error(`Not a tile type '${text[pos]}' at pos ${pos}: ` + text.substr(pos, 5))
  }
}

// Colors:
// https://color.adobe.com/create/color-wheel
//  - 5E5ED1
//  - 6787DB
//  - 669AC4
//  - 60C6DB
//  - 56D6C8
type tileToColor = (tile: TileType) => number
export const tileToColor: tileToColor = (tile) => {
  switch (tile) {
    case TileType.TopGround: return 0x6787DB
    case TileType.Ground: return 0x669AC4
    case TileType.DeepGround: return 0x60C6DB
    case TileType.Concrete: return 0xDDD8D8
    case TileType.StrongLight: return 0xFFF8F8
    case TileType.WeakLight: return 0xFFF0F0
    case TileType.MovingPlatform: return 0xDDD8D8
    case TileType.Player: return 0x5E5ED1
    case TileType.Monster: return 0x56D6C8
    default:
      const error: never = tile
      throw new Error("Non-exhaustive switch-case: tileToColor")
  }
}

type parseText = (text: string) => Error | Array<Tile>
export const parseText: parseText = (text) => {
  let line = 0
  let column = 0
  let char = null

  const list = []

  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      column += 1
      continue
    }

    if (text[i] === "\n") {
      line += 1
      column = 0
      continue
    }

    char = charToType(text, i)

    if (char instanceof Error) {
      return char
    }

    list.push(Tile(char, column, line))
    column += 1
  }

  return list
}
