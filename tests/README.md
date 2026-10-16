# Momentum test kit

Automated browser tests (Python 3 + Playwright, Chromium).

    pip install playwright pillow && python3 -m playwright install chromium
    cp demo_seed.js /home/claude/review/demo_seed.js      # or edit run.py to point at this folder
    cp sample-dayone-export.zip /tmp/dayone-export.zip; python3 - <<'P'
    from PIL import Image
    for i,c in enumerate([(220,120,60),(60,130,220),(80,180,110)]): Image.new('RGB',(900,700),c).save(f'/tmp/ph{i}.jpg','JPEG')
    P

Functional suites (run from this folder, with the app served from its own folder by run.py):

    python3 run.py core | habits | tasks | money | journal | wellness | ai | secdata | settings | edge | native | newfeat

Audits:

    python3 uxaudit.py <app folder> <port> out.json   # contrast, small text, touch targets, clipping (both themes)
    python3 geo2.py                                   # layout at 360-1440 px
    python3 align.py <app folder> 390                 # button rows aligned (also 768, 1280)

run.py expects the app at /home/claude/HabitTracker-web and the seed at /home/claude/review/demo_seed.js; change ROOT and the seed path at the top of run.py for another layout.
    python3 monkey.py <seed> <actions>                # random taps/typing; reports JS errors
