extends Button

# TooltipButton.gd - A button that renders BBCode in its tooltip (WoW Style)

func _make_custom_tooltip(for_text: String):
	if for_text == "": return null
	
	var label = RichTextLabel.new()
	label.bbcode_enabled = true
	label.text = for_text
	label.fit_content = true
	label.custom_minimum_size = Vector2(300, 0)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	var panel = PanelContainer.new()
	panel.add_child(label)
	
	# Use UITheme color if available, otherwise fallback
	var border_color = Color(0.79, 0.67, 0.44) # Bronze/Gold
	if has_node("/root/UITheme"):
		border_color = get_node("/root/UITheme").COLORS["gold_border"]
	
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.05, 0.05, 0.1, 0.95) # Dark WoW Blue
	sb.set_border_width_all(2)
	sb.border_color = border_color
	sb.content_margin_left = 12
	sb.content_margin_top = 12
	sb.content_margin_right = 12
	sb.content_margin_bottom = 12
	
	panel.add_theme_stylebox_override("panel", sb)
	return panel

