package main

import (
    "github.com/gin-gonic/gin"
    "todo-app/handlers"
    "todo-app/models"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "log"
)

func main() {
    dsn := "host=db user=postgres password=postgres dbname=todos sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("データベース接続に失敗しました:", err)
    }

    db.AutoMigrate(&models.User{}, &models.Tag{}, &models.Todo{}, &models.TodoTag{})

    r := gin.Default()
    r.Static("/static", "./static")
    r.LoadHTMLFiles("templates/index.html")

    todoHandler := handlers.NewTodoHandler(db)
    userHandler := handlers.NewUserHandler(db)

    r.GET("/", func(c *gin.Context) {
        c.HTML(200, "index.html", gin.H{})
    })
    
    r.GET("/ws", handlers.HandleWebSocket)
    
    api := r.Group("/api/v1")
    {
        api.POST("/todos", todoHandler.CreateTodo)
        api.GET("/todos", todoHandler.ListTodos)
        api.PATCH("/todos/:id/status", todoHandler.UpdateTodoStatus)
        api.DELETE("/todos/:id", todoHandler.DeleteTodo)
        api.GET("/todos/statistics", todoHandler.GetStatistics)
        api.POST("/users", userHandler.CreateUser)
    }

    go func() {
        for message := range handlers.Broadcast {
            for client := range handlers.Clients {
                err := client.WriteJSON(message)
                if err != nil {
                    log.Printf("WebSocket送信エラー: %v", err)
                    client.Close()
                    delete(handlers.Clients, client)
                }
            }
        }
    }()

    r.Run(":8080")
}
