#!/usr/bin/env python3
"""
Grid Video Extractor - Tkinter GUI for adjusting and extracting grid video clips
"""

import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageDraw, ImageTk
import subprocess
import os
from pathlib import Path

class GridExtractor:
    def __init__(self, root, video_path):
        self.root = root
        self.root.title("Grid Video Extractor")
        self.root.geometry("1200x900")
        
        self.video_path = video_path
        self.output_dir = Path(video_path).parent / "grid-clips"
        self.output_dir.mkdir(exist_ok=True)
        
        # Extract first frame from video
        self.frame_path = Path(video_path).parent / "frame-temp.jpg"
        self._extract_frame()
        
        # Load image
        self.original_img = Image.open(self.frame_path)
        self.img_width, self.img_height = self.original_img.size
        
        print(f"Video frame: {self.img_width} x {self.img_height}")
        
        # Default crop positions (will be adjusted by sliders)
        self.seam_x = self.img_width // 2  # vertical seam between left/right
        self.seam_y1 = self.img_height // 3  # horizontal seam 1 (row 1/2)
        self.seam_y2 = (self.img_height * 2) // 3  # horizontal seam 2 (row 2/3)
        self.seam_y3 = int(self.img_height * 0.668)  # horizontal seam 3 (grid/full-width)
        
        # Track last merge toggle for mutual exclusion
        self._last_merge_toggle = None
        
        # Setup UI
        self._create_widgets()
        self._update_preview()
    
    def _extract_frame(self):
        """Extract first frame from video"""
        cmd = [
            "ffmpeg", "-i", str(self.video_path),
            "-vf", "select=eq(n\\,0)",
            "-q:v", "2", "-y",
            str(self.frame_path)
        ]
        subprocess.run(cmd, capture_output=True)
    
    def _create_widgets(self):
        """Create UI widgets"""
        # Canvas for image preview
        canvas_frame = ttk.Frame(self.root)
        canvas_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        ttk.Label(canvas_frame, text="Video Frame Preview (drag seams to adjust)").pack()
        self.canvas = tk.Canvas(canvas_frame, bg="black", cursor="crosshair")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Mouse event handlers for direct seam dragging
        self.dragging_seam = None
        self.canvas_scale = 1.0
        self.canvas.bind("<Button-1>", self._on_canvas_press)
        self.canvas.bind("<B1-Motion>", self._on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_canvas_release)
        self.canvas.bind("<Motion>", self._on_canvas_motion)
        
        # Controls frame
        ctrl_frame = ttk.Frame(self.root)
        ctrl_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=10, pady=10)
        
        ttk.Label(ctrl_frame, text="Adjust Seams", font=("Arial", 12, "bold")).pack(pady=10)
        
        # Vertical seam (X)
        ttk.Label(ctrl_frame, text=f"Vertical Seam (X)").pack()
        self.seam_x_label = ttk.Label(ctrl_frame, text=f"{self.seam_x}")
        self.seam_x_label.pack()
        self.seam_x_scale = ttk.Scale(
            ctrl_frame,
            from_=100, to=self.img_width - 100,
            orient=tk.HORIZONTAL
        )
        self.seam_x_scale.pack(fill=tk.X, pady=5)
        self.seam_x_scale.set(self.seam_x)
        self.seam_x_scale.config(command=self._on_seam_x_change)
        
        ttk.Separator(ctrl_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # Horizontal seam 1 (Y1)
        ttk.Label(ctrl_frame, text=f"Horizontal Seam 1 (Y1)").pack()
        self.seam_y1_label = ttk.Label(ctrl_frame, text=f"{self.seam_y1}")
        self.seam_y1_label.pack()
        self.seam_y1_scale = ttk.Scale(
            ctrl_frame,
            from_=50, to=self.img_height - 150,
            orient=tk.HORIZONTAL
        )
        self.seam_y1_scale.pack(fill=tk.X, pady=5)
        self.seam_y1_scale.set(self.seam_y1)
        self.seam_y1_scale.config(command=self._on_seam_y1_change)
        
        ttk.Separator(ctrl_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # Horizontal seam 2 (Y2)
        ttk.Label(ctrl_frame, text=f"Horizontal Seam 2 (Y2)").pack()
        self.seam_y2_label = ttk.Label(ctrl_frame, text=f"{self.seam_y2}")
        self.seam_y2_label.pack()
        self.seam_y2_scale = ttk.Scale(
            ctrl_frame,
            from_=100, to=self.img_height - 100,
            orient=tk.HORIZONTAL
        )
        self.seam_y2_scale.pack(fill=tk.X, pady=5)
        self.seam_y2_scale.set(self.seam_y2)
        self.seam_y2_scale.config(command=self._on_seam_y2_change)
        
        ttk.Separator(ctrl_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # Horizontal seam 3 (Y3) - grid to full-width boundary
        ttk.Label(ctrl_frame, text=f"Grid/Full-Width Boundary (Y3)").pack()
        self.seam_y3_label = ttk.Label(ctrl_frame, text=f"{self.seam_y3}")
        self.seam_y3_label.pack()
        self.seam_y3_scale = ttk.Scale(
            ctrl_frame,
            from_=200, to=self.img_height - 50,
            orient=tk.HORIZONTAL
        )
        self.seam_y3_scale.pack(fill=tk.X, pady=5)
        self.seam_y3_scale.set(self.seam_y3)
        self.seam_y3_scale.config(command=self._on_seam_y3_change)
        
        ttk.Separator(ctrl_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=15)
        
        # Merge options
        ttk.Label(ctrl_frame, text="Merge Options", font=("Arial", 10, "bold")).pack()
        self.merge_5_6_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(ctrl_frame, text="Merge clips 5 & 6 (continuous left column)", variable=self.merge_5_6_var, command=self._on_merge_change).pack(anchor=tk.W, pady=2)
        
        self.merge_4_6_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(ctrl_frame, text="Merge clips 4 & 6 (continuous right column)", variable=self.merge_4_6_var, command=self._on_merge_change).pack(anchor=tk.W, pady=2)
        
        ttk.Separator(ctrl_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # Status label
        self.status_label = ttk.Label(ctrl_frame, text="", font=("Arial", 10))
        self.status_label.pack(pady=5)
        
        # Extract button
        extract_btn = ttk.Button(ctrl_frame, text="Extract Clips", command=self._extract_clips)
        extract_btn.pack(fill=tk.X, pady=10)
    
    def _on_seam_x_change(self, value):
        self.seam_x = int(float(value))
        self.seam_x_label.config(text=f"{self.seam_x}")
        self._update_preview()
    
    def _on_seam_y1_change(self, value):
        self.seam_y1 = int(float(value))
        self.seam_y1_label.config(text=f"{self.seam_y1}")
        self._update_preview()
    
    def _on_seam_y2_change(self, value):
        self.seam_y2 = int(float(value))
        self.seam_y2_label.config(text=f"{self.seam_y2}")
        self._update_preview()
    
    def _on_seam_y3_change(self, value):
        self.seam_y3 = int(float(value))
        self.seam_y3_label.config(text=f"{self.seam_y3}")
        self._update_preview()
    
    def _on_canvas_press(self, event):
        """Handle mouse press on canvas to start seam dragging"""
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        if canvas_w < 2 or canvas_h < 2:
            return
        
        # Calculate canvas scale
        scale_x = self.img_width / canvas_w
        scale_y = self.img_height / canvas_h
        
        # Get image coordinates from canvas click
        img_x = event.x * scale_x
        img_y = event.y * scale_y
        
        # Check which seam is close to the click (within 10px)
        tolerance = 15
        
        # Check vertical seam
        if abs(img_x - self.seam_x) < tolerance:
            self.dragging_seam = 'x'
            return
        
        # Check horizontal seams
        if abs(img_y - self.seam_y1) < tolerance:
            self.dragging_seam = 'y1'
            return
        
        if abs(img_y - self.seam_y2) < tolerance:
            self.dragging_seam = 'y2'
            return
        
        if abs(img_y - self.seam_y3) < tolerance:
            self.dragging_seam = 'y3'
            return
    
    def _on_canvas_drag(self, event):
        """Handle mouse drag on canvas"""
        if not self.dragging_seam:
            return
        
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        if canvas_w < 2 or canvas_h < 2:
            return
        
        # Calculate canvas scale
        scale_x = self.img_width / canvas_w
        scale_y = self.img_height / canvas_h
        
        # Get image coordinates
        img_x = event.x * scale_x
        img_y = event.y * scale_y
        
        # Clamp to image bounds
        img_x = max(100, min(self.img_width - 100, img_x))
        img_y = max(50, min(self.img_height - 50, img_y))
        
        # Update the appropriate seam
        if self.dragging_seam == 'x':
            self.seam_x = int(img_x)
            self.seam_x_scale.set(self.seam_x)
        elif self.dragging_seam == 'y1':
            self.seam_y1 = int(img_y)
            self.seam_y1_scale.set(self.seam_y1)
        elif self.dragging_seam == 'y2':
            self.seam_y2 = int(img_y)
            self.seam_y2_scale.set(self.seam_y2)
        elif self.dragging_seam == 'y3':
            self.seam_y3 = int(img_y)
            self.seam_y3_scale.set(self.seam_y3)
        
        self._update_preview()
    
    def _on_canvas_release(self, event):
        """Handle mouse release"""
        self.dragging_seam = None
    
    def _on_canvas_motion(self, event):
        """Update cursor based on proximity to seams"""
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        if canvas_w < 2 or canvas_h < 2:
            self.canvas.config(cursor="crosshair")
            return
        
        # Calculate canvas scale
        scale_x = self.img_width / canvas_w
        scale_y = self.img_height / canvas_h
        
        # Get image coordinates
        img_x = event.x * scale_x
        img_y = event.y * scale_y
        
        tolerance = 15
        
        # Check if near any seam
        if abs(img_x - self.seam_x) < tolerance:
            self.canvas.config(cursor="sb_h_double_arrow")
        elif any(abs(img_y - seam_y) < tolerance for seam_y in [self.seam_y1, self.seam_y2, self.seam_y3]):
            self.canvas.config(cursor="sb_v_double_arrow")
        else:
            self.canvas.config(cursor="crosshair")
    
    def _on_merge_change(self):
        """Handle merge checkbox toggle - mutual exclusion and preview update"""
        if self.merge_5_6_var.get() and self.merge_4_6_var.get():
            # Mutual exclusion: uncheck the other
            if self._last_merge_toggle == '5_6':
                self.merge_4_6_var.set(False)
            else:
                self.merge_5_6_var.set(False)
        self._last_merge_toggle = '5_6' if self.merge_5_6_var.get() else '4_6' if self.merge_4_6_var.get() else None
        self._update_preview()
    
    def _update_preview(self):
        """Update canvas preview with seam lines"""
        # Create preview image with overlay
        preview = self.original_img.copy()
        draw = ImageDraw.Draw(preview, 'RGBA')
        
        # Draw crop rectangles for each clip
        colors = [
            (255, 100, 100, 80),  # Clip 1 - red
            (100, 255, 100, 80),  # Clip 2 - green
            (100, 100, 255, 80),  # Clip 3 - blue
            (255, 255, 100, 80),  # Clip 4 - yellow
            (255, 100, 255, 80),  # Clip 5 - magenta
            (100, 255, 255, 80),  # Clip 6 - cyan
        ]
        
        # Clips 1-5 (2x3 grid)
        clips_2x3 = [
            (0, 0, self.seam_x, self.seam_y1),                    # Clip 1
            (self.seam_x, 0, self.img_width, self.seam_y1),       # Clip 2
            (0, self.seam_y1, self.seam_x, self.seam_y2),         # Clip 3
            (self.seam_x, self.seam_y1, self.img_width, self.seam_y2),  # Clip 4
            (0, self.seam_y2, self.seam_x, self.seam_y3),         # Clip 5
        ]
        
        for i, (x1, y1, x2, y2) in enumerate(clips_2x3):
            draw.rectangle([x1, y1, x2, y2], fill=colors[i])
            # Draw clip number
            draw.text((x1 + 10, y1 + 10), str(i + 1), fill=(255, 255, 255, 255))
        
        # Clip 6 (full-width)
        draw.rectangle([0, self.seam_y3, self.img_width, self.img_height], fill=colors[5])
        draw.text((10, self.seam_y3 + 10), "6", fill=(255, 255, 255, 255))
        
        # Draw seam lines in white (thicker for draggable seams)
        draw.line([(self.seam_x, 0), (self.seam_x, self.img_height)], fill=(255, 255, 255, 255), width=3)
        draw.line([(0, self.seam_y1), (self.img_width, self.seam_y1)], fill=(255, 255, 255, 255), width=3)
        draw.line([(0, self.seam_y2), (self.img_width, self.seam_y2)], fill=(255, 255, 255, 255), width=3)
        draw.line([(0, self.seam_y3), (self.img_width, self.seam_y3)], fill=(255, 255, 255, 255), width=3)
        
        # If merge is enabled, draw a merged outline
        if self.merge_5_6_var.get():
            merged_h = (self.seam_y3 - self.seam_y2) + (self.img_height - self.seam_y3)
            draw.rectangle([0, self.seam_y2, self.img_width, self.seam_y2 + merged_h],
                           outline=(255, 255, 0, 255), width=4)
            draw.text((self.img_width // 2 - 30, self.seam_y2 + merged_h // 2),
                      "5+6 MERGED", fill=(255, 255, 0, 255))
        elif self.merge_4_6_var.get():
            merged_h = (self.seam_y2 - self.seam_y1) + (self.seam_y3 - self.seam_y2) + (self.img_height - self.seam_y3)
            draw.rectangle([self.seam_x, self.seam_y1, self.img_width, self.seam_y1 + merged_h],
                           outline=(255, 255, 0, 255), width=4)
            draw.text((self.seam_x + 10, self.seam_y1 + merged_h // 2),
                      "4+6 MERGED", fill=(255, 255, 0, 255))
        
        # Draw small handles on seams to indicate they're draggable
        handle_size = 15
        draw.rectangle(
            [self.seam_x - handle_size, self.img_height // 2 - handle_size,
             self.seam_x + handle_size, self.img_height // 2 + handle_size],
            outline=(255, 200, 100, 255), width=2
        )
        for y in [self.seam_y1, self.seam_y2, self.seam_y3]:
            draw.rectangle(
                [self.img_width // 2 - handle_size, y - handle_size,
                 self.img_width // 2 + handle_size, y + handle_size],
                outline=(255, 200, 100, 255), width=2
            )
        
        # Resize to fit canvas
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        if canvas_width > 1 and canvas_height > 1:
            scale = min(canvas_width / self.img_width, canvas_height / self.img_height)
            new_size = (int(self.img_width * scale), int(self.img_height * scale))
            preview = preview.resize(new_size, Image.Resampling.LANCZOS)
        
        self.photo = ImageTk.PhotoImage(preview)
        self.canvas.create_image(0, 0, image=self.photo, anchor=tk.NW)
        self.canvas.config(scrollregion=self.canvas.bbox("all"))
    
    def _extract_clips(self):
        """Extract clips with current seam positions"""
        self.status_label.config(text="Extracting...", foreground="blue")
        self.root.update()
        
        try:
            # Calculate clip dimensions
            clip_w_half = self.seam_x
            clip_w_right = self.img_width - self.seam_x
            clip_h_1 = self.seam_y1
            clip_h_2 = self.seam_y2 - self.seam_y1
            clip_h_3 = self.seam_y3 - self.seam_y2
            clip_h_6 = self.img_height - self.seam_y3
            
            # Define individual clips
            crops = [
                (1, 0, 0, clip_w_half, clip_h_1),
                (2, self.seam_x, 0, clip_w_right, clip_h_1),
                (3, 0, self.seam_y1, clip_w_half, clip_h_2),
                (4, self.seam_x, self.seam_y1, clip_w_right, clip_h_2),
                (5, 0, self.seam_y2, clip_w_half, clip_h_3),
                (6, 0, self.seam_y3, self.img_width, clip_h_6),
            ]
            
            # Build the list of clips to extract (including merged ones)
            clips_to_extract = []
            
            # Always extract individual clips 1-4
            for i in range(4):
                clips_to_extract.append(crops[i])
            
            # Handle merge options for clips 5 & 6
            merge_5_6 = self.merge_5_6_var.get()
            merge_4_6 = self.merge_4_6_var.get()
            
            if merge_5_6:
                # Merge clip 5 (bottom-left) with clip 6 (full-width bottom)
                # Combined region: from left edge, starting at seam_y2, full width, down to bottom
                merged_h = (self.seam_y3 - self.seam_y2) + clip_h_6
                clips_to_extract.append((5, 0, self.seam_y2, self.img_width, merged_h))
                print(f"Merging clips 5 & 6: crop={self.img_width}:{merged_h}:0:{self.seam_y2}")
            elif merge_4_6:
                # Merge clip 4 (right column, middle row) with clip 6 (full-width bottom)
                # Combined region: from vertical seam, starting at seam_y1, right edge, down to bottom
                merged_h = (self.seam_y2 - self.seam_y1) + (self.seam_y3 - self.seam_y2) + clip_h_6
                clips_to_extract.append((4, self.seam_x, self.seam_y1, clip_w_right, merged_h))
                print(f"Merging clips 4 & 6: crop={clip_w_right}:{merged_h}:{self.seam_x}:{self.seam_y1}")
            else:
                # Extract clips 5 and 6 individually
                clips_to_extract.append(crops[4])
                clips_to_extract.append(crops[5])
            
            for clip_n, x, y, w, h in clips_to_extract:
                out_file = self.output_dir / f"clip-{clip_n}.mp4"
                cmd = [
                    "ffmpeg", "-i", str(self.video_path),
                    "-vf", f"crop={w}:{h}:{x}:{y}",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                    "-c:a", "aac", "-y",
                    str(out_file)
                ]
                print(f"Extracting clip {clip_n}: crop={w}:{h}:{x}:{y}")
                subprocess.run(cmd, capture_output=True)
            
            self.status_label.config(text="✓ Done!", foreground="green")
            messagebox.showinfo("Success", f"Extracted clips to:\n{self.output_dir}")
            
        except Exception as e:
            self.status_label.config(text="✗ Error!", foreground="red")
            messagebox.showerror("Error", f"Extraction failed:\n{e}")

if __name__ == "__main__":
    video_path = r"C:\Users\steve\MeWorld\game\docs\storyboards\video\U15-DKA-pancreas-genie-styled-5s-comfy_v2.mp4"
    
    root = tk.Tk()
    app = GridExtractor(root, video_path)
    root.mainloop()
