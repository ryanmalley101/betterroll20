function load_spell_json(spellname) {

    const loadSpell = async () => {
        const response = await fetch('https://www.dnd5eapi.co/api/spells/' + spellname);
        const spellJson = await response.json(); //extract JSON from the http response

        console.log(spellJson);
        console.log($("#spell-name"));
        $("#spell-name")[0].innerHTML = spellJson.name;

        var casttimeString = spellJson.casting_time;
        if(spellJson.ritual) {
          casttimeString = casttimeString + '<br />' + "Ritual"
        }

        $("#spell-casttime")[0].innerHTML = casttimeString;
        $("#spell-range")[0].innerHTML = spellJson.range;

        var componentsString = '';
        for (let i = 0; i < spellJson.components.length; i++) {
          componentsString += spellJson.components[i];
          if (spellJson.components[i] == 'M') {
            componentsString = componentsString + '<br /> (' + spellJson.material + ')';
          }
          if (i < spellJson.components.length - 1) {
            componentsString += ', ';
          }
        }
        console.log(componentsString);

        $("#spell-components")[0].innerHTML = componentsString;

        var durationString = '';
        if(spellJson.concentration) {
          durationString += 'Concentration <br />';
        }
        durationString += spellJson.duration;
        $("#spell-duration")[0].innerHTML = durationString;

        descString = '';
        for (let i = 0; i < spellJson.desc.length; i++) {
          descString += spellJson.desc[i];
          if (i < spellJson.components.length - 1) {
            componentsString += '<br />';
          }
        }
        $("#spell-desc")[0].innerHTML = descString;

        $("#spell-level")[0].innerHTML = spellJson.school.name + " " + spellJson.level;
        // @todo Reference classes with spells

    }
    loadSpell();
}

window.onmessage = function(e) {
    load_spell_json(e.data);
};