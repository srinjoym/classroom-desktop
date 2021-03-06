import axios from "axios"
import keytar from "keytar"
import {BrowserWindow, session} from "electron"

const { URL } = require("url")
const {trackEvent} = require("./analytics")

let authWindow

export function authorizeUser (mainWindowRef, protocolHandler) {
  openAuthWindow(mainWindowRef, protocolHandler)
}

export async function setAccessTokenFromCode (code, mainWindow) {
  if (authWindow) {
    authWindow.destroy()
  }
  // TODO: Error handling
  try {
    const token = await fetchAccessToken(code)
    await keytar.setPassword("Classroom-Assistant", "x-access-token", token)
    global.accessToken = token

    mainWindow.webContents.send("receivedAuthorization")
  } catch (error) {
    trackEvent("error", "userAuthentication", "fetchAccessToken", error)
  }
}

export async function loadAccessToken () {
  global.accessToken = await keytar.getPassword("Classroom-Assistant", "x-access-token")
}

export async function deleteAccessToken () {
  global.accessToken = null
  await keytar.deletePassword("Classroom-Assistant", "x-access-token")
}

function openAuthWindow (mainWindow, protocolHandler) {
  authWindow = new BrowserWindow({
    height: 650,
    width: 400,
    show: false,
    parent: mainWindow,
    webPreferences: {
      session: session.fromPartition("auth:session"),
      nodeIntegration: false,
    },
  })

  const authURL = new URL("http://classroom.github.com/login/oauth/authorize")

  authWindow.webContents.loadURL(authURL.toString())

  authWindow.once("ready-to-show", () => {
    if (authWindow) {
      authWindow.show()
    }
  })
}

async function fetchAccessToken (code) {
  const accessTokenURL = `http://classroom.github.com/login/oauth/access_token?code=${code}`
  const response = await axios.post(accessTokenURL, {
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json",
  })
  return response.data.access_token
}
