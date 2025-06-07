# Documentation Badge for README.md

Add this badge to your README.md file after setting up ReadTheDocs:

```markdown
[![Documentation Status](https://readthedocs.org/projects/securewatch-siem/badge/?version=latest)](https://securewatch-siem.readthedocs.io/en/latest/?badge=latest)
```

Or for a more comprehensive badge set:

```markdown
[![Documentation Status](https://readthedocs.org/projects/securewatch-siem/badge/?version=latest)](https://securewatch-siem.readthedocs.io/en/latest/?badge=latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/yourusername/SecureWatch/releases)
```

## Custom Domain Setup (Optional)

After connecting to ReadTheDocs, you can set up a custom domain:

1. Go to your project's admin page on ReadTheDocs
2. Click on "Domains" in the left sidebar
3. Add your custom domain (e.g., `docs.securewatch.com`)
4. Set up a CNAME record in your DNS:
   ```
   docs.securewatch.com CNAME securewatch-siem.readthedocs.io
   ```

## Preview Links

- **ReadTheDocs URL**: `https://securewatch-siem.readthedocs.io/`
- **Custom Domain**: `https://docs.securewatch.com/` (after setup)
- **PDF Download**: Available automatically after build
- **EPUB Download**: Available automatically after build