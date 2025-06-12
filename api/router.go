package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter configures the routes for the application.
func SetupRouter() *gin.Engine {
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	router.Use(cors.New(config))

	api := router.Group("/api")
	{
		api.POST("/items", CreateItemHandler)
		api.POST("/optimize", OptimizeHandler)
		api.DELETE("/items/:id", DeleteItemHandler)
	}

	return router
}
