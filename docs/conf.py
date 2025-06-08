# Configuration file for the Sphinx documentation builder.
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath('..'))

# -- Project information -----------------------------------------------------
project = 'SecureWatch SIEM Platform'
copyright = '2025, SecureWatch Team'
author = 'SecureWatch Team'
version = '2.1.0'
release = '2.1.0'

# -- General configuration ---------------------------------------------------
extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.napoleon',
    'sphinx.ext.intersphinx',
    'sphinx.ext.todo',
    'sphinx.ext.coverage',
    'sphinx.ext.ifconfig',
    'sphinx.ext.githubpages',
    'myst_parser',
    'sphinx_copybutton',
    'sphinx_tabs.tabs',
    'sphinxcontrib.mermaid',
    'sphinx_design',
]

# Source file parsers - Sphinx 8+ compatible
source_suffix = ['.rst', '.md']

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store', 'archive/*']

# Language settings
language = 'en'

# The master toctree document
master_doc = 'index'

# -- Options for HTML output -------------------------------------------------
html_theme = 'furo'
html_title = 'SecureWatch SIEM Platform Documentation'
html_short_title = 'SecureWatch'

# Theme options for Furo
html_theme_options = {
    "light_css_variables": {
        "color-brand-primary": "#2563eb",
        "color-brand-content": "#2563eb",
    },
    "dark_css_variables": {
        "color-brand-primary": "#3b82f6",
        "color-brand-content": "#3b82f6",
    },
    "sidebar_hide_name": True,
    "navigation_with_keys": True,
    "top_of_page_button": "edit",
}

html_static_path = ['_static']
html_css_files = [
    'custom.css',
]

# Custom logo and favicon
html_logo = '_static/securewatch-logo.svg'
html_favicon = '_static/favicon.ico'

# -- Extension configuration -------------------------------------------------

# MyST Parser configuration
myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "html_admonition",
    "html_image",
    "linkify",
    "replacements",
    "smartquotes",
    "substitution",
    "tasklist",
]

# Copy button configuration
copybutton_prompt_text = r">>> |\.\.\. |\$ |In \[\d*\]: | {2,5}\.\.\.: | {5,8}: "
copybutton_prompt_is_regexp = True

# Napoleon settings for Google-style docstrings
napoleon_google_docstring = True
napoleon_numpy_docstring = True
napoleon_include_init_with_doc = False
napoleon_include_private_with_doc = False
napoleon_include_special_with_doc = True
napoleon_use_admonition_for_examples = False
napoleon_use_admonition_for_notes = False
napoleon_use_admonition_for_references = False
napoleon_use_ivar = False
napoleon_use_param = True
napoleon_use_rtype = True
napoleon_preprocess_types = False
napoleon_type_aliases = None
napoleon_attr_annotations = True

# Intersphinx configuration
intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'django': ('https://docs.djangoproject.com/en/stable/', None),
    'requests': ('https://requests.readthedocs.io/en/stable/', None),
}

# TODO configuration
todo_include_todos = True

# Mermaid configuration
mermaid_output_format = 'svg'
mermaid_init_js = """
mermaid.initialize({
    'theme': 'base',
    'themeVariables': {
        'primaryColor': '#2563eb',
        'primaryTextColor': '#1f2937',
        'primaryBorderColor': '#1e40af',
        'lineColor': '#374151',
        'secondaryColor': '#f3f4f6',
        'tertiaryColor': '#f9fafb'
    }
});
"""

# -- Options for LaTeX output ------------------------------------------------
latex_elements = {
    'papersize': 'letterpaper',
    'pointsize': '10pt',
    'preamble': r'''
\usepackage{charter}
\usepackage[defaultsans]{lato}
\usepackage{inconsolata}
''',
}

latex_documents = [
    ('index', 'securewatch.tex', 'SecureWatch SIEM Platform Documentation',
     'SecureWatch Team', 'manual'),
]

# -- Options for manual page output ------------------------------------------
man_pages = [
    ('index', 'securewatch', 'SecureWatch SIEM Platform Documentation',
     [author], 1)
]

# -- Options for Texinfo output ----------------------------------------------
texinfo_documents = [
    ('index', 'securewatch', 'SecureWatch SIEM Platform Documentation',
     author, 'securewatch', 'Enterprise SIEM platform for comprehensive security monitoring.',
     'Miscellaneous'),
]

# -- Options for Epub output -------------------------------------------------
epub_title = project
epub_exclude_files = ['search.html']

# -- Custom configuration ----------------------------------------------------
def setup(app):
    """Sphinx application setup hook."""
    app.add_css_file('custom.css')
