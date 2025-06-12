package database

import (
	"app/models"
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

// InitDB initializes the database and creates the table with position columns.
func InitDB() error {
	var err error
	db, err = sql.Open("sqlite3", "/app/data/ferry_items.db")
	if err != nil {
		return err
	}

	createTableSQL := `CREATE TABLE IF NOT EXISTS items (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"type" TEXT, "width" REAL, "height" REAL, "length" REAL, "weight" REAL, "color" TEXT,
		"position_x" REAL, "position_y" REAL, "position_z" REAL
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Printf("Failed to create table: %v", err)
		return err
	}
	return nil
}

// CloseDB closes the database connection.
func CloseDB() {
	if db != nil {
		db.Close()
	}
}

// CreateItem inserts a new item without position data.
func CreateItem(item *models.Item) (int64, error) {
	stmt, err := db.Prepare("INSERT INTO items(type, width, height, length, weight, color) VALUES(?, ?, ?, ?, ?, ?)")
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec(item.Type, item.Width, item.Height, item.Length, item.Weight, item.Color)
	if err != nil {
		return 0, err
	}

	return res.LastInsertId()
}

// GetAllItems retrieves all items, scanning nullable position data.
func GetAllItems() ([]models.Item, error) {
	rows, err := db.Query("SELECT id, type, width, height, length, weight, color, position_x, position_y, position_z FROM items ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allItems []models.Item
	for rows.Next() {
		var item models.Item
		var posX, posY, posZ sql.NullFloat64 // Use NullFloat64 for scanning
		if err := rows.Scan(&item.ID, &item.Type, &item.Width, &item.Height, &item.Length, &item.Weight, &item.Color, &posX, &posY, &posZ); err != nil {
			return nil, err
		}
		if posX.Valid {
			item.PositionX = &posX.Float64
		}
		if posY.Valid {
			item.PositionY = &posY.Float64
		}
		if posZ.Valid {
			item.PositionZ = &posZ.Float64
		}
		allItems = append(allItems, item)
	}
	return allItems, nil
}

// UpdateItemPosition updates the position of a single item in the database.
func UpdateItemPosition(item models.PlacedItem) error {
	stmt, err := db.Prepare("UPDATE items SET position_x = ?, position_y = ?, position_z = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(item.PositionX, item.PositionY, item.PositionZ, item.ID)
	return err
}

// DeleteItem deletes an item from the database by ID.
func DeleteItem(id string) error {
	stmt, err := db.Prepare("DELETE FROM items WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(id)
	return err
}
