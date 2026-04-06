import sys
import os

target_file = r"d:\Company-Business\Apps\syncrio\app\dashboard\page.tsx"

if not os.path.exists(target_file):
    print(f"Error: {target_file} not found")
    sys.exit(1)

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement for the calendar block
new_calendar_jsx = """          {/* Publishing Calendar - Full Width */}
          <DashboardCalendar 
             currentDate={currentDate}
             setCurrentDate={setCurrentDate}
             calendarViewMode={calendarViewMode}
             setCalendarViewMode={setCalendarViewMode}
             selectedDate={selectedDate}
             onDateClick={handleDateClick}
             allPosts={allPosts}
             dragOverDate={dragOverDate}
             handleDragStart={handleDragStart}
             handleDragOver={handleDragOver}
             handleDragLeave={handleDragLeave}
             handleDrop={handleDrop}
             handlePostHover={handlePostHover}
             handlePostLeave={handlePostLeave}
             onPostClick={(post) => { setEditingPost(post); setShowEditModal(true); }}
          />"""

# Find the start of the calendar block
start_marker = "{/* Publishing Calendar - Full Width */}"
start_idx = content.find(start_marker)

if start_idx != -1:
    # Find the closing </main> tag after the calendar block
    # We want to replace everything from the start_marker to the </main> tag
    # but keep the </main> tag itself and what follows.
    end_main_tag = "</main>"
    # Search for the next </main> after the calendar starts
    main_end_idx = content.find(end_main_tag, start_idx)
    
    if main_end_idx != -1:
        # Replacement
        before = content[:start_idx]
        after = content[main_end_idx:]
        
        # New content
        new_content = before + new_calendar_jsx + "\n        " + after
        
        # Now fix the HoverOverlay at the end
        hover_marker = "{/* Hover Overlay */}\n      <HoverOverlay />"
        new_hover = "{/* Hover Overlay */}\n      <HoverOverlay hoveredPost={hoveredPost} hoverPosition={hoverPosition} />"
        
        if hover_marker in new_content:
            new_content = new_content.replace(hover_marker, new_hover)
        else:
            # Try a looser match if the above fails
            new_content = new_content.replace("<HoverOverlay />", "<HoverOverlay hoveredPost={hoveredPost} hoverPosition={hoverPosition} />")

        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully updated {target_file}")
    else:
        print("Error: Could not find </main> tag after calendar block")
else:
    print("Error: Could not find calendar start marker")
