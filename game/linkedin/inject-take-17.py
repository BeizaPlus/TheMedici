import json, time

path = r'C:\Users\steve\MeWorld\game\linkedin\state-autosave\latest.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Recording 51 — Case 113 Drowning spoken take (cleaned from Whisper)
transcript = """I told the attending I wasn't convinced.

There was this case about a drowning. The base excess number just didn't sit right with me. So I pushed back.

In Immersa, it pulled a total of 47 drowning cases, compared their mean lactate, and put them on a trending line. The mean base excess was minus 12.4.

Then it walked me through how the deficit comes from the stress response. The hypoperfusion. And the cold hitting the body all at once.

In this case, it's not just bicarbonate being consumed because of keto acids, like you'd see in diabetes. This is because of stress hyperglycemia, hypoperfusion, and cold.

That's the moment it all clicked.

In a real hospital, you learn a tone before you even open your mouth. At least that's what happened in my training. You always have to push back — sort of bureaucratically — like taking a risk to your standing in the room.

What happens when that risk disappears?

You become more curious. Like a child. You move without that second eye. You just ask, and ask again, until you understand it. At this point there's no performance. You're not managing internally how it sounds. No political correctness.

The attending in this case is not pulling from one physician's memory of a paper read years ago in residency. It's pulling from every case on the planet. Every drowning case ever seen. All at once.

That's why we built it this way. The gap between not knowing and finding out should cost you nothing."""

# Add as raw take for post index 17 (Jul 25 Case 113 Drowning)
if 'speechTakes' not in data:
    data['speechTakes'] = {}
key = '17'
if key not in data['speechTakes']:
    data['speechTakes'][key] = []

take_id = 't_17_whisper_' + str(int(time.time() * 1000))
take = {
    'id': take_id,
    'type': 'raw',
    'transcript': transcript,
    'duration': 103,
    'timestamp': int(time.time() * 1000),
    'fusedFrom': None,
    'segments': None,
    'originalId': None,
    'originalSegments': None
}
data['speechTakes'][key].append(take)

# Also set as selected take for this post
if 'selectedTake' not in data:
    data['selectedTake'] = {}
data['selectedTake'][key] = len(data['speechTakes'][key]) - 1

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print('Done — added take for post 17')
print(f'Take ID: {take_id}')
takes_count = len(data['speechTakes'][key])
print(f'Total takes for post 17: {takes_count}')
