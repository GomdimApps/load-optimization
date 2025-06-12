package api

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"app/database"
	"app/models"
	"app/optimizer"

	"log"

	"github.com/gin-gonic/gin"
)

// CreateItemHandler valida se um novo item cabe na balsa antes de salvá-lo.
func CreateItemHandler(c *gin.Context) {
	var newItem models.Item
	if err := c.ShouldBindJSON(&newItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados da requisição inválidos: " + err.Error()})
		return
	}

	// Dimensões da balsa atualizadas conforme solicitado.
	ferry := models.Ferry{
		Width: 20.0, Height: 5.0, Length: 30.0, MaxWeight: 200.0, UsableSpace: 0.90,
	}

	allItemsFromDB, err := database.GetAllItems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao buscar itens para validação: " + err.Error()})
		return
	}

	var alreadyPlaced []models.PlacedItem
	for _, item := range allItemsFromDB {
		if item.PositionX != nil && item.PositionY != nil && item.PositionZ != nil {
			placed := models.PlacedItem{
				ID: item.ID, Type: item.Type, Width: item.Width, Height: item.Height, Length: item.Length, Weight: item.Weight, Color: item.Color,
				PositionX: *item.PositionX, PositionY: *item.PositionY, PositionZ: *item.PositionZ,
			}
			alreadyPlaced = append(alreadyPlaced, placed)
		}
	}

	// Utiliza a nova função de validação que retorna erros específicos.
	if err := optimizer.CheckFitment(ferry, newItem, alreadyPlaced); err != nil {
		switch err {
		case optimizer.ErrOverweight:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Peso máximo da balsa já foi alcançado."})
		case optimizer.ErrNoSpace:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Simulação falhou: Não há mais espaço na balsa para este novo item."})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ocorreu um erro inesperado durante a validação."})
		}
		return
	}

	// Se a validação passou, salva o item no banco.
	rand.Seed(time.Now().UnixNano())
	newItem.Color = fmt.Sprintf("#%06x", rand.Intn(0xffffff+1))
	newItem.PositionX, newItem.PositionY, newItem.PositionZ = nil, nil, nil

	id, err := database.CreateItem(&newItem)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar o item no banco de dados: " + err.Error()})
		return
	}

	newItem.ID = id
	c.JSON(http.StatusCreated, newItem)
}

// OptimizeHandler calcula e salva as posições para todos os itens não alocados.
func OptimizeHandler(c *gin.Context) {
	// Dimensões da balsa atualizadas conforme solicitado.
	ferry := models.Ferry{
		Width: 20.0, Height: 5.0, Length: 30.0, MaxWeight: 200.0, UsableSpace: 0.90,
	}

	allItems, err := database.GetAllItems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve items: " + err.Error()})
		return
	}

	var alreadyPlaced []models.PlacedItem
	var itemsToPlace []models.Item
	for _, item := range allItems {
		if item.PositionX != nil && item.PositionY != nil && item.PositionZ != nil {
			alreadyPlaced = append(alreadyPlaced, models.PlacedItem{
				ID: item.ID, Type: item.Type, Width: item.Width, Height: item.Height, Length: item.Length, Weight: item.Weight, Color: item.Color,
				PositionX: *item.PositionX, PositionY: *item.PositionY, PositionZ: *item.PositionZ,
			})
		} else {
			itemsToPlace = append(itemsToPlace, item)
		}
	}

	newlyPlaced, stillUnplaced := optimizer.PackItems(ferry, itemsToPlace, alreadyPlaced)

	for _, pItem := range newlyPlaced {
		if err := database.UpdateItemPosition(pItem); err != nil {
			log.Printf("Failed to update position for item %d: %v", pItem.ID, err)
		}
	}

	finalPlacedItems := append(alreadyPlaced, newlyPlaced...)

	totalWeight := 0.0
	totalVolumeOccupied := 0.0
	for _, pItem := range finalPlacedItems {
		totalWeight += pItem.Weight
		totalVolumeOccupied += pItem.Width * pItem.Height * pItem.Length
	}

	// O volume da balsa para o cálculo de utilização é o volume TOTAL utilizável.
	usableFerryVolume := ferry.Width * ferry.Height * ferry.Length * ferry.UsableSpace
	utilization := 0.0
	if usableFerryVolume > 0 {
		utilization = (totalVolumeOccupied / usableFerryVolume) * 100
	}

	result := models.OptimizationResult{
		FerryInfo:     ferry,
		PlacedItems:   finalPlacedItems,
		UnplacedItems: stillUnplaced,
		TotalWeight:   totalWeight,
		TotalVolume:   totalVolumeOccupied,
		FerryVolume:   usableFerryVolume, // Retorna o volume utilizável para clareza
		Utilization:   utilization,
	}

	c.JSON(http.StatusOK, result)
}

// DeleteItemHandler deleta um item do banco de dados pelo ID
func DeleteItemHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID não fornecido"})
		return
	}

	err := database.DeleteItem(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao deletar item: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deletado com sucesso"})
}
