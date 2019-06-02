<script>
  export let imageURL;
  export let title;
</script>

<article class="bb b--black-10">
  <a class="db pv4 ph3 ph0-l no-underline black dim" href="#0">
    <div class="flex flex-column flex-row-ns">
      <div class="pr3-ns mb4 mb0-ns w-100 w-40-ns">
        <img
          src="{imageURL}"
          class="db"
          alt="Photo of a whale's tale coming crashing out of
        the water."
        />
      </div>
      <div class="w-100 w-60-ns pl3-ns">
        <h1 class="f3 fw1 baskerville mt0 lh-title">
          {title}
        </h1>
        <p class="f6 f5-l lh-copy">
          Whale is the common name for a widely distributed and diverse group of
          fully aquatic placental marine mammals. They are an informal grouping
          within the infraorder Cetacea, usually excluding dolphins and
          porpoises.
        </p>
        <p class="f6 lh-copy mv0">By Robin Darnell</p>
      </div>
    </div>
  </a>
</article>
