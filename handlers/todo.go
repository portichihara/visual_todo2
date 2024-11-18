package handlers

import (
	"net/http"
	"todo-app/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"time"
)

type TodoHandler struct {
	db *gorm.DB
}

func NewTodoHandler(db *gorm.DB) *TodoHandler {
	return &TodoHandler{db: db}
}

func (h *TodoHandler) CreateTodo(c *gin.Context) {
	var todo models.Todo
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var defaultUser models.User
	result := h.db.FirstOrCreate(&defaultUser, models.User{
		Name: "DefaultUser",
		Email: "default@example.com",
		Password: "default",
	})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	todo.UserID = defaultUser.ID

	if err := h.db.Create(&todo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	BroadcastMessage("update", todo)
	c.JSON(http.StatusCreated, todo)
}

func (h *TodoHandler) ListTodos(c *gin.Context) {
	var todos []models.Todo
	query := h.db.Preload("Tags")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}

	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&todos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, todos)
}

func (h *TodoHandler) UpdateTodoStatus(c *gin.Context) {
	todoID := c.Param("id")
	var status struct {
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Model(&models.Todo{}).Where("id = ?", todoID).Update("status", status.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	BroadcastMessage("status_change", gin.H{"todoId": todoID, "newStatus": status.Status})
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *TodoHandler) DeleteTodo(c *gin.Context) {
	todoID := c.Param("id")

	if err := h.db.Delete(&models.Todo{}, todoID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	BroadcastMessage("delete", gin.H{"todoId": todoID})
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *TodoHandler) GetStatistics(c *gin.Context) {
	var stats struct {
		Total         int64 `json:"total"`
		Completed     int64 `json:"completed"`
		HighPriority  int64 `json:"highPriority"`
		MediumPriority int64 `json:"mediumPriority"`
		LowPriority   int64 `json:"lowPriority"`
		Overdue       int64 `json:"overdue"`
	}

	h.db.Model(&models.Todo{}).Count(&stats.Total)
	h.db.Model(&models.Todo{}).Where("status = ?", "完了").Count(&stats.Completed)
	h.db.Model(&models.Todo{}).Where("priority = ?", 3).Count(&stats.HighPriority)
	h.db.Model(&models.Todo{}).Where("priority = ?", 2).Count(&stats.MediumPriority)
	h.db.Model(&models.Todo{}).Where("priority = ?", 1).Count(&stats.LowPriority)
	h.db.Model(&models.Todo{}).Where("due_date < ? AND status != ?", time.Now(), "完了").Count(&stats.Overdue)

	c.JSON(http.StatusOK, stats)
}
