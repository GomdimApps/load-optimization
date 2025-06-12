package models

// Item represents a single item to be loaded onto the ferry, which may or may not have a position.
type Item struct {
	ID        int64    `json:"id"`
	Type      string   `json:"type"`
	Width     float64  `json:"width"`
	Height    float64  `json:"height"`
	Length    float64  `json:"length"`
	Weight    float64  `json:"weight"`
	Color     string   `json:"color"`
	PositionX *float64 `json:"position_x,omitempty"`
	PositionY *float64 `json:"position_y,omitempty"`
	PositionZ *float64 `json:"position_z,omitempty"`
}

// PlacedItem is a helper struct for the optimizer, guaranteeing non-nil positions.
type PlacedItem struct {
	ID        int64   `json:"id"`
	Type      string  `json:"type"`
	Width     float64 `json:"width"`
	Height    float64 `json:"height"`
	Length    float64 `json:"length"`
	Weight    float64 `json:"weight"`
	Color     string  `json:"color"`
	PositionX float64 `json:"position_x"`
	PositionY float64 `json:"position_y"`
	PositionZ float64 `json:"position_z"`
}

// Ferry defines the properties of the ferry.
type Ferry struct {
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
	Length      float64 `json:"length"`
	MaxWeight   float64 `json:"max_weight"`
	UsableSpace float64 `json:"usable_space_percentage"`
}

// OptimizationResult is the final structure returned by the /optimize endpoint.
type OptimizationResult struct {
	FerryInfo     Ferry        `json:"ferry_info"`
	PlacedItems   []PlacedItem `json:"placed_items"`
	UnplacedItems []Item       `json:"unplaced_items"`
	TotalWeight   float64      `json:"total_weight"`
	TotalVolume   float64      `json:"total_volume_occupied"`
	FerryVolume   float64      `json:"ferry_total_volume"`
	Utilization   float64      `json:"utilization_percentage"`
}
