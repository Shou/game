import {
  Coord,
  Natural,
  X, Y,
} from "./Math"

export interface Rectangle {
  width: X
  height: Y
}

export interface Circle {
  radius: Natural
}

export interface Style {
  style?: string
}

export interface CoreTexture {
  collidable: boolean
  movementFactors: Coord
  position?: "center" | "top-left"
  layer: Natural
  filter?: string
  // TODO scale: Natural
  // TODO movable: boolean
}

export type GameImage = {
  readonly type: "GameImage"
  image: HTMLImageElement
} & CoreTexture & Rectangle & Style

export interface Font {
  family: string
  size: number
}

export type GameText = {
  readonly type: "GameText"
  font: Font
  text: string
} & CoreTexture & Rectangle & Style

export type GameRect = {
  readonly type: "GameRect"
} & CoreTexture & Rectangle & Style

export interface GradientStop {
  offset: number
  color: string
}

export type GameLinearGradient = {
  readonly type: "GameLinearGradient"
  colorStops: Array<GradientStop>
  start: Coord
  stop: Coord
} & CoreTexture & Rectangle

export type GameLine = {
  readonly type: "GameLine"
  lineWidth: Natural
} & CoreTexture & Rectangle & Style

export type GameArc = {
  readonly type: "GameArc"
  startAngle: number
  endAngle: number
  antiClockwise: boolean
  fill: boolean
  lineWidth: Natural
} & CoreTexture & Circle & Style

export type GameTexture
  = GameImage
  | GameText
  | GameRect
  | GameLinearGradient
  | GameLine
  | GameArc

export interface CoreElem<A> {
  texture: A
  coord: Coord
}

export type GameElement
  = CoreElem<GameImage>
  | CoreElem<GameText>
  | CoreElem<GameRect>
  | CoreElem<GameLinearGradient>
  | CoreElem<GameLine>
  | CoreElem<GameArc>

export type GameElements = Array<GameElement>
