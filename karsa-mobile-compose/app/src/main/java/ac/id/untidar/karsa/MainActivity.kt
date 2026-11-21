package ac.id.untidar.karsa

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ac.id.untidar.karsa.auth.KarsaAuth
import ac.id.untidar.karsa.theme.KarsaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        KarsaAuth.get(this).onIntent(intent)
        setContent {
            KarsaTheme {
                KarsaApp()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        KarsaAuth.get(this).onIntent(intent)
    }
}
