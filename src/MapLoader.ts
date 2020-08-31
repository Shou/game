export const enum TileType {
  Grass = "G",
  Ground = "g",
  Rock = "r",
  Concrete = "C",
  MovingPlatform = "m",
  MovementMarker = "|",
  StrongLight = "L",
  WeakLight = "l",
}

export interface Tile {
  type: TileType
  x: number
  y: number
}

const Tile = (type: TileType, x: number, y: number) => ({ type, x, y })

const charToType = (text: string, pos: number) => {
  switch (text[pos]) {
    case TileType.Grass:
      return TileType.Grass
    case TileType.Concrete:
      return TileType.Concrete
    case TileType.MovingPlatform:
      return TileType.MovingPlatform
    case TileType.MovementMarker:
      return TileType.MovementMarker
    case TileType.StrongLight:
      return TileType.StrongLight
    case TileType.WeakLight:
      return TileType.WeakLight
    case TileType.Ground:
      return TileType.Ground
    case TileType.Rock:
      return TileType.Rock
    default:
      return new Error(`Not a tile type '${text[pos]}' at pos ${pos}: ` + text.substr(pos, 5))
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
