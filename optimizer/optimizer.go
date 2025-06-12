package optimizer

import (
	"app/models"
	"errors"
	"math"
	"sort"
)

const margin = 0.25

type Point struct {
	X, Y, Z float64
}

// Pre-defined errors for clear feedback on validation failure.
var (
	ErrOverweight = errors.New("item exceeds ferry's max weight")
	ErrNoSpace    = errors.New("no available space for item")
)

// checkCollision verifies if a new item at a specific position physically overlaps with any already placed items.
func checkCollision(newItem models.Item, pos Point, placedItems []models.PlacedItem) bool {
	newItemMaxX := pos.X + newItem.Width
	newItemMaxY := pos.Y + newItem.Height
	newItemMaxZ := pos.Z + newItem.Length

	for _, pItem := range placedItems {
		pItemMaxX := pItem.PositionX + pItem.Width
		pItemMaxY := pItem.PositionY + pItem.Height
		pItemMaxZ := pItem.PositionZ + pItem.Length

		// Standard AABB collision check for direct physical overlap.
		if pos.X < pItemMaxX && newItemMaxX > pItem.PositionX &&
			pos.Y < pItemMaxY && newItemMaxY > pItem.PositionY &&
			pos.Z < pItemMaxZ && newItemMaxZ > pItem.PositionZ {
			return true // Collision detected
		}
	}
	return false // No collision
}

// getRotations returns all 6 possible orientations for a given item.
func getRotations(item models.Item) []models.Item {
	rotations := make([]models.Item, 0, 6)
	dims := [3]float64{item.Width, item.Height, item.Length}
	used := make(map[[3]float64]bool)
	p := [3]int{0, 1, 2}
	for {
		w, h, l := dims[p[0]], dims[p[1]], dims[p[2]]
		dimKey := [3]float64{w, h, l}
		if !used[dimKey] {
			rotatedItem := item
			rotatedItem.Width, rotatedItem.Height, rotatedItem.Length = w, h, l
			rotations = append(rotations, rotatedItem)
			used[dimKey] = true
		}
		i := len(p) - 1
		for i > 0 && p[i-1] >= p[i] {
			i--
		}
		if i <= 0 {
			break
		}
		j := len(p) - 1
		for p[j] <= p[i-1] {
			j--
		}
		p[i-1], p[j] = p[j], p[i-1]
		j = len(p) - 1
		for i < j {
			p[i], p[j] = p[j], p[i]
			i++
			j--
		}
	}
	return rotations
}

// getAnchorPoints generates possible placement positions based on existing items.
func getAnchorPoints(placedItems []models.PlacedItem) []Point {
	anchors := []Point{{X: margin, Y: margin, Z: margin}}
	for _, pItem := range placedItems {
		anchors = append(anchors, Point{X: pItem.PositionX + pItem.Width + margin, Y: pItem.PositionY, Z: pItem.PositionZ})
		anchors = append(anchors, Point{X: pItem.PositionX, Y: pItem.PositionY + pItem.Height + margin, Z: pItem.PositionZ})
		anchors = append(anchors, Point{X: pItem.PositionX, Y: pItem.PositionY, Z: pItem.PositionZ + pItem.Length + margin})
	}
	sort.Slice(anchors, func(i, j int) bool {
		if anchors[i].Z != anchors[j].Z {
			return anchors[i].Z < anchors[j].Z
		}
		if anchors[i].Y != anchors[j].Y {
			return anchors[i].Y < anchors[j].Y
		}
		return anchors[i].X < anchors[j].X
	})
	return anchors
}

// PackItems tries to place a list of new items considering items that are already on the ferry.
func PackItems(ferry models.Ferry, itemsToPlace []models.Item, alreadyPlaced []models.PlacedItem) ([]models.PlacedItem, []models.Item) {
	var newlyPlacedItems []models.PlacedItem
	var failedToPlaceItems []models.Item
	allPlacedItems := append([]models.PlacedItem(nil), alreadyPlaced...)
	currentWeight := 0.0
	for _, pItem := range allPlacedItems {
		currentWeight += pItem.Weight
	}
	ferryUsableLength := ferry.Length * ferry.UsableSpace

	for _, item := range itemsToPlace {
		if currentWeight+item.Weight > ferry.MaxWeight {
			failedToPlaceItems = append(failedToPlaceItems, item)
			continue
		}

		var bestRotation models.Item
		bestPosition := Point{}
		foundPlacement := false
		minZ, minY, minX := math.MaxFloat64, math.MaxFloat64, math.MaxFloat64
		anchors := getAnchorPoints(allPlacedItems)

		for _, rotation := range getRotations(item) {
			for _, anchor := range anchors {
				if anchor.X+rotation.Width+margin > ferry.Width ||
					anchor.Y+rotation.Height+margin > ferry.Height ||
					anchor.Z+rotation.Length+margin > ferryUsableLength {
					continue
				}
				if !checkCollision(rotation, anchor, allPlacedItems) {
					if !foundPlacement || anchor.Z < minZ || (anchor.Z == minZ && anchor.Y < minY) || (anchor.Z == minZ && anchor.Y == minY && anchor.X < minX) {
						minZ, minY, minX = anchor.Z, anchor.Y, anchor.X
						bestRotation = rotation
						bestPosition = anchor
						foundPlacement = true
					}
				}
			}
		}

		if foundPlacement {
			placed := models.PlacedItem{
				ID: item.ID, Type: item.Type, Color: item.Color, Weight: item.Weight,
				Width: bestRotation.Width, Height: bestRotation.Height, Length: bestRotation.Length,
				PositionX: bestPosition.X, PositionY: bestPosition.Y, PositionZ: bestPosition.Z,
			}
			newlyPlacedItems = append(newlyPlacedItems, placed)
			allPlacedItems = append(allPlacedItems, placed)
			currentWeight += item.Weight
		} else {
			failedToPlaceItems = append(failedToPlaceItems, item)
		}
	}
	return newlyPlacedItems, failedToPlaceItems
}

// CheckFitment validates if a single new item can fit, checking weight and space separately.
func CheckFitment(ferry models.Ferry, newItem models.Item, alreadyPlaced []models.PlacedItem) error {
	totalWeight := newItem.Weight
	for _, pItem := range alreadyPlaced {
		totalWeight += pItem.Weight
	}
	if totalWeight > ferry.MaxWeight {
		return ErrOverweight
	}

	ferryUsableLength := ferry.Length * ferry.UsableSpace
	anchors := getAnchorPoints(alreadyPlaced)

	for _, rotation := range getRotations(newItem) {
		for _, anchor := range anchors {
			if anchor.X+rotation.Width+margin > ferry.Width ||
				anchor.Y+rotation.Height+margin > ferry.Height ||
				anchor.Z+rotation.Length+margin > ferryUsableLength {
				continue
			}
			if !checkCollision(rotation, anchor, alreadyPlaced) {
				return nil // Found a valid spot
			}
		}
	}

	return ErrNoSpace // No rotation could fit in any anchor point
}
