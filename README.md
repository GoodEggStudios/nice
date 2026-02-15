# Nice 👍

> The anonymous nice button — no sign-in required

## What is Nice?

Nice is an embeddable "nice" button that doesn't require users to create an account or sign in. Site owners register to get a button, visitors click to nice. That's it.

It's not liking. It's **nice'ing**.

## Why?

- **For users**: No login walls, no tracking, just say "nice!"
- **For site owners**: Simple integration, spam-resistant, privacy-friendly

## Status

🚧 **Spec phase** — See [openspec/specs/NICE.md](openspec/specs/NICE.md) for the full specification.

## Quick Look

```html
<script 
  src="https://nice.example/embed.js" 
  data-button="btn_abc123"
  async>
</script>
```

That's the entire integration.

## Spec

The full specification lives in [`openspec/specs/NICE.md`](openspec/specs/NICE.md), covering:

- Core concepts (buttons, sites, likes)
- Anti-spam strategy
- API design
- Embed options
- Privacy considerations

## License

MIT
