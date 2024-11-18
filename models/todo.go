package models

import (
    "time"
    "gorm.io/gorm"
)

type Todo struct {
    gorm.Model
    Title       string     `json:"title"`
    Description string     `json:"description"`
    Status      string     `json:"status"`
    Priority    int        `json:"priority"`
    UserID      uint       `json:"user_id" gorm:"foreignKey:UserID"`
    DueDate     *time.Time `json:"due_date,omitempty"`
    Tags        []Tag      `gorm:"many2many:todo_tags;"`
}

type Tag struct {
    gorm.Model
    Name  string `json:"name"`
    Color string `json:"color"`
    Todos []Todo `gorm:"many2many:todo_tags;"`
}

type TodoTag struct {
    TodoID uint `gorm:"primaryKey"`
    TagID  uint `gorm:"primaryKey"`
}