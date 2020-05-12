
import sun from "../assets/sun.png"
import grass from "../assets/grass.png"
import stars from "../assets/stars.png"
import cloud1 from "../assets/cloud1.png"
import cloud2 from "../assets/cloud2.png"
import cloud3 from "../assets/cloud3.png"
import cloud4 from "../assets/cloud4.png"
import cloud5 from "../assets/cloud5.png"
import cloud6 from "../assets/cloud6.png"
import cloud7 from "../assets/cloud7.png"
import cloud8 from "../assets/cloud8.png"
import cloud9 from "../assets/cloud9.png"
import mountain1 from "../assets/mountain1.png"

export const sunImage = new Image()
sunImage.src = sun
export const grassImage = new Image()
grassImage.src = grass
export const starsImage = new Image()
starsImage.src = stars
export const cloudImages = [
  cloud1, cloud2, cloud3, cloud4, cloud5, cloud6, cloud7, cloud8, cloud9
].map(src => Object.assign(new Image(), { src }))
export const mountainImages = [
  mountain1
].map(src => Object.assign(new Image(), { src }))
