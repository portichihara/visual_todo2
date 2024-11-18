package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var (
    Clients    = make(map[*websocket.Conn]bool)
    Broadcast  = make(chan interface{})
    upgrader   = websocket.Upgrader{
        CheckOrigin: func(r *http.Request) bool {
            return true
        },
    }
)

func HandleWebSocket(c *gin.Context) {
    ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    defer ws.Close()

    Clients[ws] = true
    defer delete(Clients, ws)

    for {
        _, _, err := ws.ReadMessage()
        if err != nil {
            break
        }
    }
}

func BroadcastMessage(messageType string, data interface{}) {
    message := map[string]interface{}{
        "type": messageType,
        "data": data,
    }
    Broadcast <- message
}