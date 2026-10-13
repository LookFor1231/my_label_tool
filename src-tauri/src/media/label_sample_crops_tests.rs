use super::*;
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "sample-crop-test-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        image::RgbImage::from_fn(20, 15, |x, y| image::Rgb([x as u8, y as u8, 0]))
            .save(path.join("source.png"))
            .unwrap();
        Self(path)
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn bounds() -> CropBounds {
    CropBounds {
        x: 3.2,
        y: 4.8,
        width: 5.0,
        height: 6.0,
    }
}

#[test]
fn selection_writes_actual_crop_and_discard_only_removes_owned_files() {
    let f = Fixture::new();
    let source = f.0.join("source.png");
    let cache = f.0.join("cache");
    let preview = preview(&f.0, &source, bounds()).unwrap();
    assert!(preview.starts_with("data:image/png;base64,"));
    assert!(!cache.exists());
    assert_eq!(fs::read_dir(&f.0).unwrap().count(), 1);
    let result = create(&f.0, &source, bounds(), &cache).unwrap();
    let decoded = image::open(&result.path).unwrap().to_rgb8();
    assert_eq!(decoded.dimensions(), (6, 7));
    assert_eq!(decoded.get_pixel(0, 0).0, [3, 4, 0]);
    assert_eq!(decoded.get_pixel(5, 6).0, [8, 10, 0]);
    discard(&source).unwrap();
    assert!(source.exists());
    discard(&result.path).unwrap();
    discard(&result.path).unwrap();
    assert!(!result.path.exists());
}

#[test]
fn clipping_invalid_geometry_and_project_boundary() {
    let f = Fixture::new();
    let source = f.0.join("source.png");
    let cropped = crop(
        &f.0,
        &source,
        CropBounds {
            x: -10.0,
            y: -5.0,
            width: 15.0,
            height: 10.0,
        },
    )
    .unwrap();
    assert_eq!((cropped.width(), cropped.height()), (5, 5));
    for b in [
        CropBounds {
            x: 21.0,
            ..bounds()
        },
        CropBounds {
            width: 0.0,
            ..bounds()
        },
        CropBounds {
            x: f64::NAN,
            ..bounds()
        },
        CropBounds {
            height: f64::INFINITY,
            ..bounds()
        },
    ] {
        assert!(crop(&f.0, &source, b).is_err());
    }
    let other = Fixture::new();
    assert!(crop(&f.0, &other.0.join("source.png"), bounds()).is_err());
    assert!(crop(&f.0, &f.0.join("missing.png"), bounds()).is_err());
}

#[test]
fn exif_oriented_annotation_crops_match_displayed_pixels() {
    use image::{codecs::jpeg::JpegEncoder, ImageEncoder};

    let f = Fixture::new();
    // Synthetic asymmetric marker on a black background. No project data is used.
    let source_pixels = image::RgbImage::from_fn(96, 64, |x, y| {
        if (8..24).contains(&x) && (8..32).contains(&y) {
            image::Rgb([220 + (x % 16) as u8, 160 + (y % 16) as u8, 60])
        } else {
            image::Rgb([0, 0, 0])
        }
    });
    // Bounds in the displayed coordinate system, including swapped dimensions.
    let displayed_bounds = [
        (8, 8, 16, 24),
        (72, 8, 16, 24),
        (72, 32, 16, 24),
        (8, 32, 16, 24),
        (8, 8, 24, 16),
        (32, 8, 24, 16),
        (32, 72, 24, 16),
        (8, 72, 24, 16),
    ];
    for (index, (x, y, width, height)) in displayed_bounds.into_iter().enumerate() {
        let orientation = index as u8 + 1;
        // Little-endian TIFF with one SHORT Orientation entry in IFD0.
        let exif = vec![
            b'I',
            b'I',
            42,
            0,
            8,
            0,
            0,
            0,
            1,
            0,
            0x12,
            1,
            3,
            0,
            1,
            0,
            0,
            0,
            orientation,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
        ];
        let mut jpeg = Vec::new();
        let mut encoder = JpegEncoder::new_with_quality(&mut jpeg, 95);
        encoder.set_exif_metadata(exif).unwrap();
        encoder.encode_image(&source_pixels).unwrap();
        let raw = image::load_from_memory(&jpeg).unwrap().to_rgb8();
        let source = f.0.join("oriented.jpg");
        fs::write(&source, &jpeg).unwrap();
        let bounds = CropBounds {
            x: x as f64,
            y: y as f64,
            width: width as f64,
            height: height as f64,
        };
        // Independent display-to-file coordinate mapping checks rotation AND mirroring.
        let expected = image::RgbImage::from_fn(width, height, |dx, dy| {
            let (u, v) = (x + dx, y + dy);
            let (sx, sy) = match orientation {
                1 => (u, v),
                2 => (95 - u, v),
                3 => (95 - u, 63 - v),
                4 => (u, 63 - v),
                5 => (v, u),
                6 => (v, 63 - u),
                7 => (95 - v, 63 - u),
                8 => (95 - v, u),
                _ => unreachable!(),
            };
            *raw.get_pixel(sx, sy)
        });
        let cropped = crop(&f.0, &source, bounds).unwrap().to_rgb8();
        assert!(
            cropped.pixels().all(|pixel| pixel[0] > 200),
            "orientation {orientation}: visible marker was cropped as dark background"
        );
        assert_eq!(cropped, expected, "orientation {orientation}");

        let preview = preview(&f.0, &source, bounds).unwrap();
        let result = create(&f.0, &source, bounds, &f.0.join("cache")).unwrap();
        assert_eq!(preview, result.preview);
        assert_eq!(image::open(&result.path).unwrap().to_rgb8(), expected);
        let preview_bytes = base64::engine::general_purpose::STANDARD
            .decode(preview.strip_prefix("data:image/png;base64,").unwrap())
            .unwrap();
        assert_eq!(
            image::load_from_memory(&preview_bytes).unwrap().to_rgb8(),
            DynamicImage::ImageRgb8(expected)
                .thumbnail(256, 256)
                .to_rgb8()
        );
        discard(&result.path).unwrap();
    }
}

#[test]
fn crop_rejects_decoded_buffer_over_budget_before_reading_pixels() {
    let f = Fixture::new();
    // Header-only BMP: dimensions are allowed, but the RGB buffer exceeds 128 MiB.
    let mut bmp = vec![0_u8; 54];
    bmp[..2].copy_from_slice(b"BM");
    bmp[10..14].copy_from_slice(&54_u32.to_le_bytes());
    bmp[14..18].copy_from_slice(&40_u32.to_le_bytes());
    bmp[18..22].copy_from_slice(&8192_i32.to_le_bytes());
    bmp[22..26].copy_from_slice(&8192_i32.to_le_bytes());
    bmp[26..28].copy_from_slice(&1_u16.to_le_bytes());
    bmp[28..30].copy_from_slice(&24_u16.to_le_bytes());
    let source = f.0.join("oversized.bmp");
    fs::write(&source, bmp).unwrap();
    let expected = image::ImageError::Limits(image::error::LimitError::from_kind(
        image::error::LimitErrorKind::InsufficientMemory,
    ));
    assert_eq!(
        crop(&f.0, &source, bounds()).unwrap_err(),
        text::label_sample_error(expected)
    );
}
